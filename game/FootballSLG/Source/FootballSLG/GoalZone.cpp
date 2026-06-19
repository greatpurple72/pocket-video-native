#include "GoalZone.h"
#include "MatchBall.h"
#include "MatchGameMode.h"
#include "Components/BoxComponent.h"

AGoalZone::AGoalZone()
{
	PrimaryActorTick.bCanEverTick = false;

	Trigger = CreateDefaultSubobject<UBoxComponent>(TEXT("Trigger"));
	RootComponent = Trigger;
	Trigger->SetBoxExtent(FVector(120.f, 366.f, 250.f)); // 约球门大小(可在编辑器调)
	Trigger->SetCollisionProfileName(TEXT("Trigger"));    // QueryOnly,叠加所有
	Trigger->SetGenerateOverlapEvents(true);
	Trigger->OnComponentBeginOverlap.AddDynamic(this, &AGoalZone::OnOverlap);
}

void AGoalZone::OnOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp,
	int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!OtherActor || !OtherActor->IsA(AMatchBall::StaticClass()))
	{
		return;
	}
	if (AMatchGameMode* GM = GetWorld() ? GetWorld()->GetAuthGameMode<AMatchGameMode>() : nullptr)
	{
		GM->OnGoalScored(/*bHomeGoal=*/ !bIsHomeGoal);
	}
}
