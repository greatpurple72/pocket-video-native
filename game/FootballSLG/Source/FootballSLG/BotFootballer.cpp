#include "BotFootballer.h"
#include "MatchBall.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "EngineUtils.h"

ABotFootballer::ABotFootballer()
{
	PrimaryActorTick.bCanEverTick = true;

	VisMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VisMesh"));
	RootComponent = VisMesh;
	VisMesh->SetRelativeScale3D(FVector(0.7f, 0.7f, 1.8f));
	VisMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (CylMesh.Succeeded())
	{
		VisMesh->SetStaticMesh(CylMesh.Object);
	}
}

void ABotFootballer::BeginPlay()
{
	Super::BeginPlay();
	for (TActorIterator<AMatchBall> It(GetWorld()); It; ++It)
	{
		Ball = *It;
		break;
	}
}

void ABotFootballer::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (KickCooldown > 0.f)
	{
		KickCooldown -= DeltaSeconds;
	}
	if (!Ball || !Ball->BallMesh)
	{
		return;
	}

	FVector ToBall = Ball->GetActorLocation() - GetActorLocation();
	ToBall.Z = 0.f;
	const float Dist = ToBall.Size();

	if (Dist > KickRange)
	{
		// 运动学追球
		const FVector Dir = ToBall.GetSafeNormal();
		AddActorWorldOffset(Dir * Speed * DeltaSeconds, /*bSweep=*/true);
		if (!Dir.IsNearlyZero())
		{
			SetActorRotation(Dir.Rotation());
		}
	}
	else if (KickCooldown <= 0.f)
	{
		// 把球踢向目标球门
		FVector ToGoal = TargetGoal - Ball->GetActorLocation();
		ToGoal.Z = 0.f;
		ToGoal.Normalize();
		Ball->Kick(ToGoal * KickPower + FVector(0.f, 0.f, 200.f));
		KickCooldown = 0.8f;
	}
}
