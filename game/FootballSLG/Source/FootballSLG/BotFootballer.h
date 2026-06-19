#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "BotFootballer.generated.h"

class UStaticMeshComponent;
class AMatchBall;

/** 简易对手 AI(灰盒):运动学追球,靠近后把球踢向目标球门。 */
UCLASS()
class FOOTBALLSLG_API ABotFootballer : public APawn
{
	GENERATED_BODY()

public:
	ABotFootballer();
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, Category = "Bot") UStaticMeshComponent* VisMesh;
	UPROPERTY(EditAnywhere, Category = "Bot") float Speed = 700.f;
	UPROPERTY(EditAnywhere, Category = "Bot") float KickRange = 170.f;
	UPROPERTY(EditAnywhere, Category = "Bot") float KickPower = 1000.f;
	/** 把球踢向的目标球门位置(默认 -X 方向;在编辑器里按你的球门摆放调整) */
	UPROPERTY(EditAnywhere, Category = "Bot") FVector TargetGoal = FVector(-2600.f, 0.f, 0.f);

protected:
	virtual void BeginPlay() override;
	UPROPERTY() AMatchBall* Ball = nullptr;
	float KickCooldown = 0.f;
};
