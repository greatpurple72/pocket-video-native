#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "MatchHUD.generated.h"

/** 纯 C++ HUD:画比分 + 计时 + 操作提示(无需 UMG 资源,灰盒用)。 */
UCLASS()
class FOOTBALLSLG_API AMatchHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;
};
