#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MatchGameMode.generated.h"

class AMatchBall;
class AFootballer;
class UDataTable;

/** 比赛 GameMode:阵容(队友/对手 AI 阵型)、比分/计时、进球与出界重置、赛后结算、球员属性驱动。 */
UCLASS()
class FOOTBALLSLG_API AMatchGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMatchGameMode();
	virtual void Tick(float DeltaSeconds) override;

	void OnGoalScored(bool bHomeGoal);
	/** 由玩家球员在 BeginPlay 调用:取 DataTable 中 PlayerRowName 行应用属性 */
	void ApplyStatsToPlayer(AFootballer* Player);

	UPROPERTY(BlueprintReadOnly, Category = "Match") int32 HomeScore = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Match") int32 AwayScore = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Match") float MatchClock = 0.f;
	UPROPERTY(BlueprintReadOnly, Category = "Match") bool bEnded = false;
	UPROPERTY(BlueprintReadOnly, Category = "Match") FString ResultText;

	// —— 配置(编辑器内设)——
	UPROPERTY(EditAnywhere, Category = "Match") UDataTable* StatsTable = nullptr;     // 指向导入的 DT_FootballerStats
	UPROPERTY(EditAnywhere, Category = "Match") FName PlayerRowName = TEXT("messi");  // 玩家用哪个球员
	UPROPERTY(EditAnywhere, Category = "Match") float MatchDuration = 120.f;          // demo 一场时长(秒)
	UPROPERTY(EditAnywhere, Category = "Match") float HalfLength = 2400.f;            // 半场长(X)
	UPROPERTY(EditAnywhere, Category = "Match") float HalfWidth = 1500.f;             // 半场宽(Y)

protected:
	virtual void BeginPlay() override;
	void ResetBall();
	void SpawnFormations();
	void EndMatch();

	UPROPERTY() AMatchBall* Ball = nullptr;
	FVector BallStart = FVector(0.f, 0.f, 150.f);
};
