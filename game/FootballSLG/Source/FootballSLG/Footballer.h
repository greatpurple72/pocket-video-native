#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Footballer.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class AMatchBall;

/**
 * 可控球员(Phase 0 灰盒)。带球/冲刺/射门 + eFootball 式跟随镜头。
 * 手感参数全部 EditAnywhere,可在编辑器内实时调。详见 feel-previz.md。
 */
UCLASS()
class FOOTBALLSLG_API AFootballer : public ACharacter
{
	GENERATED_BODY()

public:
	AFootballer();
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

protected:
	virtual void BeginPlay() override;

	UPROPERTY(VisibleAnywhere, Category = "Camera") USpringArmComponent* SpringArm;
	UPROPERTY(VisibleAnywhere, Category = "Camera") UCameraComponent* Camera;
	UPROPERTY(VisibleAnywhere, Category = "Mesh")   UStaticMeshComponent* VisMesh;

	// —— 手感参数(引擎内可调)——
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkSpeed = 600.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintSpeed = 1100.f;
	UPROPERTY(EditAnywhere, Category = "Feel") float ControlRadius = 160.f;       // 控球半径
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkPush = 350.f;            // 慢走触球推力(cm/s)
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintPush = 750.f;          // 冲刺触球推力(更大=控球更松=风险)
	UPROPERTY(EditAnywhere, Category = "Feel") float WalkTouchInterval = 0.13f;   // 触球节奏
	UPROPERTY(EditAnywhere, Category = "Feel") float SprintTouchInterval = 0.16f;
	UPROPERTY(EditAnywhere, Category = "Feel") float ShootSpeed = 1700.f;         // 射门力度
	UPROPERTY(EditAnywhere, Category = "Feel") float ShootLift = 450.f;           // 射门上抬(起弧)
	UPROPERTY(EditAnywhere, Category = "Feel") float PassSpeed = 950.f;           // 传球力度(平地)

	UPROPERTY() AMatchBall* Ball = nullptr;

private:
	bool bSprinting = false;
	float DribbleCooldown = 0.f;

	void MoveForward(float Value);
	void MoveRight(float Value);
	void StartSprint();
	void StopSprint();
	void Shoot();
	void Pass();
};
