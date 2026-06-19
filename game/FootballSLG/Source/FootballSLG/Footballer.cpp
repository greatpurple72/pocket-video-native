#include "Footballer.h"
#include "MatchBall.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/CapsuleComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "EngineUtils.h" // TActorIterator

AFootballer::AFootballer()
{
	PrimaryActorTick.bCanEverTick = true;

	// 朝向跟随移动方向(eFootball 式),控制器不强制朝向
	bUseControllerRotationYaw = false;
	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bOrientRotationToMovement = true;
	Move->RotationRate = FRotator(0.f, 720.f, 0.f);
	Move->MaxWalkSpeed = WalkSpeed;
	Move->BrakingDecelerationWalking = 2048.f;

	// 跟随镜头(球员身后上方,带滞后做平滑)
	SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
	SpringArm->SetupAttachment(RootComponent);
	SpringArm->TargetArmLength = 650.f;
	SpringArm->SetRelativeRotation(FRotator(-22.f, 0.f, 0.f));
	SpringArm->SetRelativeLocation(FVector(0.f, 0.f, 90.f));
	SpringArm->bUsePawnControlRotation = false;
	SpringArm->bInheritPitch = false;
	SpringArm->bInheritRoll = false;
	SpringArm->bEnableCameraLag = true;
	SpringArm->CameraLagSpeed = 5.f;
	SpringArm->bEnableCameraRotationLag = true;
	SpringArm->CameraRotationLagSpeed = 6.f;

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(SpringArm);

	// 占位身体网格(灰盒,后续换卡通/写实角色)
	VisMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VisMesh"));
	VisMesh->SetupAttachment(RootComponent);
	VisMesh->SetRelativeLocation(FVector(0.f, 0.f, -90.f));
	VisMesh->SetRelativeScale3D(FVector(0.7f, 0.7f, 1.8f));
	VisMesh->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CylMesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
	if (CylMesh.Succeeded())
	{
		VisMesh->SetStaticMesh(CylMesh.Object);
	}
}

void AFootballer::BeginPlay()
{
	Super::BeginPlay();

	// 找到场景里的球(灰盒:取第一个 AMatchBall)
	for (TActorIterator<AMatchBall> It(GetWorld()); It; ++It)
	{
		Ball = *It;
		break;
	}
}

void AFootballer::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (DribbleCooldown > 0.f)
	{
		DribbleCooldown -= DeltaSeconds;
	}
	if (!Ball || !Ball->BallMesh)
	{
		return;
	}

	// 带球:移动中且球在控球半径内 → 周期性给球向前的触球推力。
	// 冲刺时推力更大 → 球被推远 → 控球变松(风险回报)。
	const float Speed2D = GetVelocity().Size2D();
	FVector Fwd = GetActorForwardVector();
	Fwd.Z = 0.f;
	Fwd.Normalize();

	const FVector ToBall = Ball->GetActorLocation() - GetActorLocation();
	const float Dist2D = ToBall.Size2D();

	if (Speed2D > 20.f && Dist2D < ControlRadius && DribbleCooldown <= 0.f)
	{
		const float Push = bSprinting ? SprintPush : WalkPush;
		Ball->Kick(Fwd * Push);
		DribbleCooldown = bSprinting ? SprintTouchInterval : WalkTouchInterval;
	}
}

void AFootballer::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	PlayerInputComponent->BindAxis("MoveForward", this, &AFootballer::MoveForward);
	PlayerInputComponent->BindAxis("MoveRight", this, &AFootballer::MoveRight);
	PlayerInputComponent->BindAction("Sprint", IE_Pressed, this, &AFootballer::StartSprint);
	PlayerInputComponent->BindAction("Sprint", IE_Released, this, &AFootballer::StopSprint);
	PlayerInputComponent->BindAction("Shoot", IE_Pressed, this, &AFootballer::Shoot);
	PlayerInputComponent->BindAction("Pass", IE_Pressed, this, &AFootballer::Pass);
}

void AFootballer::MoveForward(float Value)
{
	if (FMath::Abs(Value) > KINDA_SMALL_NUMBER)
	{
		AddMovementInput(FVector::ForwardVector, Value); // 世界坐标:前=+X
	}
}

void AFootballer::MoveRight(float Value)
{
	if (FMath::Abs(Value) > KINDA_SMALL_NUMBER)
	{
		AddMovementInput(FVector::RightVector, Value);
	}
}

void AFootballer::StartSprint()
{
	bSprinting = true;
	GetCharacterMovement()->MaxWalkSpeed = SprintSpeed;
}

void AFootballer::StopSprint()
{
	bSprinting = false;
	GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
}

void AFootballer::Shoot()
{
	if (!Ball)
	{
		return;
	}
	const float Dist2D = (Ball->GetActorLocation() - GetActorLocation()).Size2D();
	if (Dist2D < ControlRadius + 60.f)
	{
		FVector Fwd = GetActorForwardVector();
		Fwd.Z = 0.f;
		Fwd.Normalize();
		Ball->Kick(Fwd * ShootSpeed + FVector(0.f, 0.f, ShootLift));
	}
}

void AFootballer::Pass()
{
	if (!Ball)
	{
		return;
	}
	const float Dist2D = (Ball->GetActorLocation() - GetActorLocation()).Size2D();
	if (Dist2D < ControlRadius + 60.f)
	{
		FVector Fwd = GetActorForwardVector();
		Fwd.Z = 0.f;
		Fwd.Normalize();
		Ball->Kick(Fwd * PassSpeed + FVector(0.f, 0.f, 120.f)); // 平传略带上抬
	}
}
