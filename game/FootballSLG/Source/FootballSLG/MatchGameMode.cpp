#include "MatchGameMode.h"
#include "Footballer.h"
#include "BotFootballer.h"
#include "MatchBall.h"
#include "MatchHUD.h"
#include "FootballerStats.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/DataTable.h"
#include "EngineUtils.h"

AMatchGameMode::AMatchGameMode()
{
	PrimaryActorTick.bCanEverTick = true;
	DefaultPawnClass = AFootballer::StaticClass();
	HUDClass = AMatchHUD::StaticClass();
}

void AMatchGameMode::BeginPlay()
{
	Super::BeginPlay();

	for (TActorIterator<AMatchBall> It(GetWorld()); It; ++It)
	{
		Ball = *It;
		BallStart = Ball->GetActorLocation();
		break;
	}

	SpawnFormations();
}

void AMatchGameMode::ApplyStatsToPlayer(AFootballer* Player)
{
	if (!Player || !StatsTable) { return; }
	if (const FFootballerStatsRow* Row = StatsTable->FindRow<FFootballerStatsRow>(PlayerRowName, TEXT("ApplyStatsToPlayer")))
	{
		Player->ApplyStats(*Row);
	}
}

void AMatchGameMode::SpawnFormations()
{
	UWorld* W = GetWorld();
	if (!W) { return; }

	const FVector AwayGoal(HalfLength, 0.f, 0.f);   // 主队进攻方向(+X)
	const FVector HomeGoal(-HalfLength, 0.f, 0.f);  // 客队进攻方向(-X)

	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	auto SpawnBot = [&](EBotTeam Team, const FVector& Pos, const FVector& Goal)
	{
		if (ABotFootballer* Bot = W->SpawnActor<ABotFootballer>(ABotFootballer::StaticClass(), Pos, FRotator::ZeroRotator, P))
		{
			Bot->Team = Team;
			Bot->HomePosition = Pos;
			Bot->TargetGoal = Goal;
		}
	};

	// 主队队友(玩家自己另算一名);进攻 +X
	SpawnBot(EBotTeam::Home, FVector(-700.f, -700.f, 100.f), AwayGoal);
	SpawnBot(EBotTeam::Home, FVector(-700.f,  700.f, 100.f), AwayGoal);
	SpawnBot(EBotTeam::Home, FVector(-200.f,    0.f, 100.f), AwayGoal);

	// 对手;进攻 -X
	SpawnBot(EBotTeam::Away, FVector( 700.f, -700.f, 100.f), HomeGoal);
	SpawnBot(EBotTeam::Away, FVector( 700.f,  700.f, 100.f), HomeGoal);
	SpawnBot(EBotTeam::Away, FVector( 250.f, -300.f, 100.f), HomeGoal);
	SpawnBot(EBotTeam::Away, FVector( 250.f,  300.f, 100.f), HomeGoal);
	SpawnBot(EBotTeam::Away, FVector(1400.f,    0.f, 100.f), HomeGoal);
}

void AMatchGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (bEnded) { return; }

	MatchClock += DeltaSeconds;

	// 出界:球越过边线(Y)或端线(X,非球门)→ 回中开球
	if (Ball)
	{
		const FVector B = Ball->GetActorLocation();
		if (FMath::Abs(B.Y) > HalfWidth + 60.f || FMath::Abs(B.X) > HalfLength + 300.f)
		{
			ResetBall();
		}
	}

	if (MatchClock >= MatchDuration)
	{
		EndMatch();
	}
}

void AMatchGameMode::OnGoalScored(bool bHomeGoal)
{
	if (bEnded) { return; }
	if (bHomeGoal) { ++HomeScore; } else { ++AwayScore; }
	ResetBall();
}

void AMatchGameMode::ResetBall()
{
	if (Ball && Ball->BallMesh)
	{
		Ball->BallMesh->SetPhysicsLinearVelocity(FVector::ZeroVector);
		Ball->BallMesh->SetPhysicsAngularVelocityInRadians(FVector::ZeroVector);
		Ball->SetActorLocation(BallStart, false, nullptr, ETeleportType::ResetPhysics);
	}
}

void AMatchGameMode::EndMatch()
{
	bEnded = true;

	// 赛后结算(接 docs/design/slg/economy 经济:胜负→资源产出)
	const bool bWin = HomeScore > AwayScore;
	const bool bDraw = HomeScore == AwayScore;
	const int32 Funds = bWin ? 300 : (bDraw ? 120 : 60);
	const int32 TransferPoints = bWin ? 20 : 10;
	const FString Outcome = bWin ? TEXT("胜利!") : (bDraw ? TEXT("平局") : TEXT("惜败"));

	ResultText = FString::Printf(TEXT("FULL TIME  %d - %d   %s   赛后奖励 +%d Funds  +%d 转会点"),
		HomeScore, AwayScore, *Outcome, Funds, TransferPoints);

	UE_LOG(LogTemp, Display, TEXT("[Match] %s"), *ResultText);
}
