#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "FootballerStats.generated.h"

/** 球员属性行(对应设计仓库 docs/design/slg/footballer-data/spec.md)。用 DataTable 驱动。 */
USTRUCT(BlueprintType)
struct FFootballerStatsRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") FString DisplayName;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") FString Rarity;     // N/R/SR/SSR/UR
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Pace = 70;       // 速度
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Dribbling = 70;  // 盘带
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Passing = 70;    // 传球
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Shooting = 70;   // 射门
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Defending = 70;  // 防守
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats") int32 Physical = 70;   // 体能
};
