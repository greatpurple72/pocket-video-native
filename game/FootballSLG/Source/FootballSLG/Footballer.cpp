#include "Footballer.h"
#include "MatchBall.h"
#include "MatchGameMode.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Components/StaticMeshComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "EngineUtils.h"

AFootballer::AFootballer()
{
	PrimaryActorTick.bCanEverTick = true;

	bUseControllerRotationYaw = false;
	UCharacterMovementComponent* Move = GetCharacterMovement();
	Move->bOrientRotationToMovement = true;
	Move->RotationRate = FRotator(0.f, 720.f, 0.f);
	Move->MaxWalkSpeed = WalkSpeed;
	Move->BrakingDecelerationWalking = 2048.f;

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

	for (TActorIterator<AMatchBall> It(GetWorld()); It; ++It)
	{
		Ball = *It;
		break;
	}

	// 养成→影响比赛:从 GameMode 的 DataTable 取本玩家球员属性并应用
	if (AMatchGameMode* GM = GetWorld() ? GetWorld()->GetAuthGameMode<AMatchGameMode>() : nullptr)
	{
		GM->ApplyStatsToPlayer(this);
	}
}

void AFootballer::ApplyStats(const FFootballerStatsRow& Row)
{
	FootballerName = Row.DisplayName;
	WalkSpeed = 450.f + Row.Pace * 2.0f;
	SprintSpeed = 800.f + Row.Pace * 4.0f;
	ControlRadius = 130.f + Row.Dribbling * 0.5f;
	WalkTouchInterval = FMath::Lerp(0.18f, 0.10f, Row.Dribbling / 100.f);
	SprintTouchInterval = FMath::Lerp(0.22f, 0.14f, Row.Dribbling / 100.f);
	ShootSpeed = 1200.f + Row.Shooting * 8.0f;
	PassSpeed = 650.f + Row.Passing * 5.0f;
	if (UCharacterMovementComponent* Move = GetCharacterMovement())
	{
		Move->MaxWalkSpeed = WalkSpeed;
	}
}

void AFootballer::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// 触屏摇杆 → 移动(世界坐标:屏幕上=前进=+X)
	if (bJoyActive && !JoyVec.IsNearlyZero())
	{
		AddMovementInput(FVector::ForwardVector, -JoyVec.Y);
		AddMovementInput(FVector::RightVector, JoyVec.X);
	}

	if (DribbleCooldown > 0.f)
	{
		DribbleCooldown -= DeltaSeconds;
	}
	if (!Ball || !Ball->BallMesh)
	{
		return;
	}

	const float Speed2D = GetVelocity().Size2D();
	FVector Fwd = GetActorForwardVector();
	Fwd.Z = 0.f;
	Fwd.Normalize();
	const float Dist2D = (Ball->GetActorLocation() - GetActorLocation()).Size2D();

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

	PlayerInputComponent->BindTouch(IE_Pressed, this, &AFootballer::OnTouchPressed);
	PlayerInputComponent->BindTouch(IE_Repeat, this, &AFootballer::OnTouchMoved);
	PlayerInputComponent->BindTouch(IE_Released, this, &AFootballer::OnTouchReleased);
}

void AFootballer::MoveForward(float Value)
{
	if (FMath::Abs(Value) > KINDA_SMALL_NUMBER)
	{
		AddMovementInput(FVector::ForwardVector, Value);
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
	if (!Ball) { return; }
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
	if (!Ball) { return; }
	const float Dist2D = (Ball->GetActorLocation() - GetActorLocation()).Size2D();
	if (Dist2D < ControlRadius + 60.f)
	{
		FVector Fwd = GetActorForwardVector();
		Fwd.Z = 0.f;
		Fwd.Normalize();
		Ball->Kick(Fwd * PassSpeed + FVector(0.f, 0.f, 120.f));
	}
}

void AFootballer::GetViewport(float& OutW, float& OutH) const
{
	FVector2D VP(1920.f, 1080.f);
	if (GEngine && GEngine->GameViewport)
	{
		GEngine->GameViewport->GetViewportSize(VP);
	}
	OutW = VP.X;
	OutH = VP.Y;
}

void AFootballer::OnTouchPressed(ETouchIndex::Type Finger, FVector Location)
{
	float W, H; GetViewport(W, H);
	const FVector2D P(Location.X, Location.Y);

	// 左半屏 = 虚拟摇杆
	if (P.X < W * 0.5f && !bJoyActive)
	{
		bJoyActive = true;
		JoyFinger = (int32)Finger;
		JoyStart = P;
		JoyVec = FVector2D::ZeroVector;
		return;
	}
	// 右侧按钮:射门 / 传球 / 冲刺
	const FVector2D ShootC(W - 130.f, H - 130.f);
	const FVector2D PassC(W - 250.f, H - 110.f);
	const FVector2D SprintC(W - 170.f, H - 250.f);
	if (FVector2D::Distance(P, ShootC) < 70.f) { Shoot(); }
	else if (FVector2D::Distance(P, PassC) < 55.f) { Pass(); }
	else if (FVector2D::Distance(P, SprintC) < 55.f) { StartSprint(); SprintFinger = (int32)Finger; }
}

void AFootballer::OnTouchMoved(ETouchIndex::Type Finger, FVector Location)
{
	if (bJoyActive && (int32)Finger == JoyFinger)
	{
		FVector2D D(Location.X - JoyStart.X, Location.Y - JoyStart.Y);
		const float MaxR = 90.f;
		const float M = D.Size();
		if (M > MaxR) { D *= MaxR / M; }
		JoyVec = D / MaxR;
	}
}

void AFootballer::OnTouchReleased(ETouchIndex::Type Finger, FVector Location)
{
	if ((int32)Finger == JoyFinger)
	{
		bJoyActive = false;
		JoyFinger = -1;
		JoyVec = FVector2D::ZeroVector;
	}
	if ((int32)Finger == SprintFinger)
	{
		StopSprint();
		SprintFinger = -1;
	}
}
