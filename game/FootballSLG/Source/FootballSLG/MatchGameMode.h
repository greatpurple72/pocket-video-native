#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MatchGameMode.generated.h"

/** 比赛 GameMode:默认 Pawn = AFootballer。 */
UCLASS()
class FOOTBALLSLG_API AMatchGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMatchGameMode();
};
