#pragma once

#include "CoreMinimal.h"
#include "InputCoreTypes.h"
#include "GameFramework/Character.h"
#include "FootballerStats.h"
#include "Footballer.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class AMatchBall;

/**
 * 可控球员。带球/冲刺/射门/传球 + 跟随镜头 + 触屏虚拟摇杆 + 属性驱动(DataTable)。
 * 手感参数 EditAnywhere;ApplyStats() 用球员属性改写手感(养成→影响比赛)。
 */
UCLASS()
class FOOTBALLSLG_API AFootballer : public ACharacter
{
	GENERATED_BODY()

public:
	AFootballer();
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	/** 用球员属性改写手感(由 GameMode 在 BeginPlay 调用) */
	void ApplyStats(const FFootballerStatsRow& Row);

	// —— 触屏状态(供 HUD 绘制)——
	bool IsJoyActive() const { return bJoyActive; }
	FVector2D GetJoyStart() const { return JoyStart; }
	FVector2D GetJoyVec() const { return JoyVec; }

protected:
	virtual void BeginPlay() override;

	UPROPERTY(VisibleAnywhere, Category = "Camera") USpringArmComponent* SpringArm;
	UPROPERTY(VisibleAnywhere, Category = "Camera") UCameraComponent* Camera;
	UPROPERTY(VisibleAnywhere, Category = "Mesh")   UStaticMeshComponent* VisMesh;

	UPROPERTY(VisibleAnywhere, Category = "Stats") FString FootballerName = TEXT("Rookie");

	// —— 手感参数 ——
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkSpeed = 600.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintSpeed = 1100.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float ControlRadius = 160.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkPush = 350.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintPush = 750.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkTouchInterval = 0.13f;
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintTouchInterval = 0.16f;
	UPROPERTY(EditAnywhere, Category = "Feel") float ShootSpeed = 1700.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float ShootLift = 450.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float PassSpeed = 950.f;

	UPROPERTY() AMatchBall* Ball = nullptr;

private:
	bool bSprinting = false;
	float DribbleCooldown = 0.f;

	// 触屏
	bool bJoyActive = false;
	int32 JoyFinger = -1;
	int32 SprintFinger = -1;
	FVector2D JoyStart = FVector2D::ZeroVector;
	FVector2D JoyVec = FVector2D::ZeroVector;

	void MoveForward(float Value);
	void MoveRight(float Value);
	void StartSprint();
	void StopSprint();
	void Shoot();
	void Pass();
	void NextMatch();

	void OnTouchPressed(ETouchIndex::Type Finger, FVector Location);
	void OnTouchMoved(ETouchIndex::Type Finger, FVector Location);
	void OnTouchReleased(ETouchIndex::Type Finger, FVector Location);
	void GetViewport(float& OutW, float& OutH) const;
};
