#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "FootballGameInstance.generated.h"

/** 俱乐部持久化数据(跨场不销毁):资源、赛季进度、联赛战绩。接 docs/design/slg/economy。 */
UCLASS()
class FOOTBALLSLG_API UFootballGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	UPROPERTY(BlueprintReadOnly, Category = "Club") int32 Funds = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Club") int32 TransferPoints = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Season") int32 MatchIndex = 0;   // 第几场(0 起)
	UPROPERTY(BlueprintReadOnly, Category = "Season") int32 LeaguePoints = 0; // 联赛积分(胜3平1)
	UPROPERTY(BlueprintReadOnly, Category = "Season") int32 Wins = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Season") int32 Draws = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Season") int32 Losses = 0;

	/** 赛后记录:发奖励 + 更新战绩/积分 */
	void RecordMatch(int32 HomeScore, int32 AwayScore, int32 FundsReward, int32 TPReward)
	{
		Funds += FundsReward;
		TransferPoints += TPReward;
		if (HomeScore > AwayScore) { ++Wins; LeaguePoints += 3; }
		else if (HomeScore == AwayScore) { ++Draws; LeaguePoints += 1; }
		else { ++Losses; }
	}

	/** 进入下一场 */
	void AdvanceMatch() { ++MatchIndex; }
};
