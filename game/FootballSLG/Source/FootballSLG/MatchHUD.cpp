#include "MatchHUD.h"
#include "MatchGameMode.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"

void AMatchHUD::DrawHUD()
{
	Super::DrawHUD();
	if (!Canvas)
	{
		return;
	}

	AMatchGameMode* GM = GetWorld() ? GetWorld()->GetAuthGameMode<AMatchGameMode>() : nullptr;
	UFont* Big = GEngine ? GEngine->GetLargeFont() : nullptr;
	UFont* Small = GEngine ? GEngine->GetSmallFont() : nullptr;
	const float CX = Canvas->SizeX * 0.5f;

	if (GM)
	{
		const FString Score = FString::Printf(TEXT("HOME  %d - %d  AWAY"), GM->HomeScore, GM->AwayScore);
		const int32 M = FMath::FloorToInt(GM->MatchClock / 60.f);
		const int32 S = FMath::FloorToInt(FMath::Fmod(GM->MatchClock, 60.f));
		const FString Clock = FString::Printf(TEXT("%02d:%02d"), M, S);
		DrawText(Score, FLinearColor::White, CX - 110.f, 24.f, Big, 1.4f);
		DrawText(Clock, FLinearColor(1.f, 0.84f, 0.25f), CX - 26.f, 56.f, Big, 1.2f);
	}

	DrawText(TEXT("WASD/Stick: move & dribble   Shift/RT: sprint   Space: shoot   E: pass"),
		FLinearColor(0.85f, 0.93f, 1.f), 20.f, Canvas->SizeY - 28.f, Small, 1.0f);
}
