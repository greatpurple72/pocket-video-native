#include "MatchGameMode.h"
#include "Footballer.h"
#include "BotFootballer.h"
#include "MatchBall.h"
#include "MatchHUD.h"
#include "FootballerStats.h"
#include "FootballGameInstance.h"
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

	// 对手难度随赛季场次递增
	float AwayScale = 1.f;
	if (UFootballGameInstance* GI = GetGameInstance<UFootballGameInstance>())
	{
		AwayScale = 1.f + GI->MatchIndex * 0.08f;
	}

	FActorSpawnParameters P;
	P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	auto SpawnBot = [&](EBotTeam Team, const FVector& Pos, const FVector& Goal, bool bKeeper, float Scale)
	{
		if (ABotFootballer* Bot = W->SpawnActor<ABotFootballer>(ABotFootballer::StaticClass(), Pos, FRotator::ZeroRotator, P))
		{
			Bot->Team = Team;
			Bot->HomePosition = Pos;
			Bot->TargetGoal = Goal;
			Bot->Speed *= Scale;
			if (bKeeper)
			{
				Bot->ChaseRadius = 700.f;   // 守门员只在禁区附近活动
				Bot->KickPower = 1500.f;     // 大脚解围
			}
		}
	};

	// 守门员(各队站自家球门前,把球向前解围)
	SpawnBot(EBotTeam::Home, FVector(-HalfLength + 200.f, 0.f, 100.f), AwayGoal, true, 1.f);
	SpawnBot(EBotTeam::Away, FVector( HalfLength - 200.f, 0.f, 100.f), HomeGoal, true, AwayScale);

	// 主队队友(玩家自己另算一名);进攻 +X
	SpawnBot(EBotTeam::Home, FVector(-700.f, -700.f, 100.f), AwayGoal, false, 1.f);
	SpawnBot(EBotTeam::Home, FVector(-700.f,  700.f, 100.f), AwayGoal, false, 1.f);
	SpawnBot(EBotTeam::Home, FVector(-200.f,    0.f, 100.f), AwayGoal, false, 1.f);

	// 对手;进攻 -X(难度随场次)
	SpawnBot(EBotTeam::Away, FVector( 700.f, -700.f, 100.f), HomeGoal, false, AwayScale);
	SpawnBot(EBotTeam::Away, FVector( 700.f,  700.f, 100.f), HomeGoal, false, AwayScale);
	SpawnBot(EBotTeam::Away, FVector( 250.f, -300.f, 100.f), HomeGoal, false, AwayScale);
	SpawnBot(EBotTeam::Away, FVector( 250.f,  300.f, 100.f), HomeGoal, false, AwayScale);
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

	// 写入俱乐部持久化(资源累计 + 联赛积分/战绩)
	if (UFootballGameInstance* GI = GetGameInstance<UFootballGameInstance>())
	{
		GI->RecordMatch(HomeScore, AwayScore, Funds, TransferPoints);
	}

	ResultText = FString::Printf(TEXT("FULL TIME  %d - %d   %s   +%d Funds  +%d 转会点   [Enter 下一场]"),
		HomeScore, AwayScore, *Outcome, Funds, TransferPoints);

	UE_LOG(LogTemp, Display, TEXT("[Match] %s"), *ResultText);
}
