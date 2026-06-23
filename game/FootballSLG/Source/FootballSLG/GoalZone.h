#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "GoalZone.generated.h"

class UBoxComponent;

/** 球门触发区:球进入则通知 GameMode 计分并重置开球。 */
UCLASS()
class FOOTBALLSLG_API AGoalZone : public AActor
{
	GENERATED_BODY()

public:
	AGoalZone();

	/** 勾选=这是主队的球门(球进此门 → 客队得分);不勾=客队球门(主队得分)。 */
	UPROPERTY(EditAnywhere, Category = "Goal")
	bool bIsHomeGoal = false;

	UPROPERTY(VisibleAnywhere, Category = "Goal")
	UBoxComponent* Trigger;

protected:
	UFUNCTION()
	void OnOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp,
		int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);
};
