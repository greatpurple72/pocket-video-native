#include "MatchGameMode.h"
#include "Footballer.h"
#include "BotFootballer.h"
#include "MatchBall.h"
#include "MatchHUD.h"
#include "Components/StaticMeshComponent.h"
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

	// 生成一个对手 AI(灰盒演示)
	if (UWorld* W = GetWorld())
	{
		FActorSpawnParameters P;
		P.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		W->SpawnActor<ABotFootballer>(ABotFootballer::StaticClass(), FVector(900.f, 0.f, 100.f), FRotator::ZeroRotator, P);
	}
}

void AMatchGameMode::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	MatchClock += DeltaSeconds;
}

void AMatchGameMode::OnGoalScored(bool bHomeGoal)
{
	if (bHomeGoal) { ++HomeScore; }
	else { ++AwayScore; }
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
