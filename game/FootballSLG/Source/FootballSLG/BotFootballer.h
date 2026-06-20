#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "BotFootballer.generated.h"

class UStaticMeshComponent;
class AMatchBall;

UENUM(BlueprintType)
enum class EBotTeam : uint8 { Home, Away };

/** 队友/对手 AI(灰盒):球近则追球+踢向目标球门(抢断=抢到球踢走);球远则回阵型站位。 */
UCLASS()
class FOOTBALLSLG_API ABotFootballer : public APawn
{
	GENERATED_BODY()

public:
	ABotFootballer();
	virtual void Tick(float DeltaSeconds) override;

	UPROPERTY(VisibleAnywhere, Category = "Bot") UStaticMeshComponent* VisMesh;
	UPROPERTY(EditAnywhere, Category = "Bot") EBotTeam Team = EBotTeam::Away;
	UPROPERTY(EditAnywhere, Category = "Bot") float Speed = 700.f;
	UPROPERTY(EditAnywhere, Category = "Bot") float ChaseRadius = 1000.f;  // 球进此半径才上抢
	UPROPERTY(EditAnywhere, Category = "Bot") float KickRange = 170.f;
	UPROPERTY(EditAnywhere, Category = "Bot") float KickPower = 1000.f;
	UPROPERTY(EditAnywhere, Category = "Bot") FVector HomePosition = FVector::ZeroVector; // 阵型站位
	UPROPERTY(EditAnywhere, Category = "Bot") FVector TargetGoal = FVector(-2600.f, 0.f, 0.f); // 进攻目标门

protected:
	virtual void BeginPlay() override;
	UPROPERTY() AMatchBall* Ball = nullptr;
	float KickCooldown = 0.f;
};
