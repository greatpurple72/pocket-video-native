#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MatchGameMode.generated.h"

class AMatchBall;

/** 比赛 GameMode:默认 Pawn=Footballer,管理比分/计时/进球重置,并生成一个对手 AI。 */
UCLASS()
class FOOTBALLSLG_API AMatchGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMatchGameMode();
	virtual void Tick(float DeltaSeconds) override;

	/** 进球计分(由 GoalZone 调用);bHomeGoal=true 主队得分 */
	void OnGoalScored(bool bHomeGoal);

	UPROPERTY(BlueprintReadOnly, Category = "Match") int32 HomeScore = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Match") int32 AwayScore = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Match") float MatchClock = 0.f;

protected:
	virtual void BeginPlay() override;
	void ResetBall();

	UPROPERTY() AMatchBall* Ball = nullptr;
	FVector BallStart = FVector(0.f, 0.f, 150.f);
};
