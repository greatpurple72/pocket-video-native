#include "MatchBall.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"

AMatchBall::AMatchBall()
{
	PrimaryActorTick.bCanEverTick = false;

	BallMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BallMesh"));
	RootComponent = BallMesh;

	static ConstructorHelpers::FObjectFinder<UStaticMesh> SphereMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
	if (SphereMesh.Succeeded())
	{
		BallMesh->SetStaticMesh(SphereMesh.Object);
	}

	// 引擎基础球直径 100uu(=1m)。缩放到 ~22cm 的足球大小(卡通可放大)。
	BallMesh->SetRelativeScale3D(FVector(0.22f));
	BallMesh->SetSimulatePhysics(true);
	BallMesh->SetMassOverrideInKg(NAME_None, 0.43f, true); // 真实足球质量
	BallMesh->SetLinearDamping(0.6f);   // 草皮滚动阻力(引擎内再调)
	BallMesh->SetAngularDamping(0.4f);
	BallMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	BallMesh->SetCollisionProfileName(TEXT("PhysicsActor"));
	BallMesh->SetNotifyRigidBodyCollision(true);
}

void AMatchBall::Kick(const FVector& VelocityChange)
{
	if (BallMesh)
	{
		BallMesh->AddImpulse(VelocityChange, NAME_None, /*bVelChange=*/true);
	}
}
