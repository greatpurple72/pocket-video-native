#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MatchBall.generated.h"

class UStaticMeshComponent;

/** 比赛用球(物理球)。手感地基,详见设计仓库 docs/design/match/previz/feel-previz.md */
UCLASS()
class FOOTBALLSLG_API AMatchBall : public AActor
{
	GENERATED_BODY()

public:
	AMatchBall();

	/** 球的网格体(模拟物理)。带球/射门通过对它施加冲量实现。 */
	UPROPERTY(VisibleAnywhere, Category = "Ball")
	UStaticMeshComponent* BallMesh;

	/** 施加一次冲量(bVelChange=true,单位 cm/s,与质量无关,便于调手感) */
	void Kick(const FVector& VelocityChange);
};
