#include "MatchHUD.h"
#include "MatchGameMode.h"
#include "Footballer.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "GameFramework/PlayerController.h"

void AMatchHUD::DrawHUD()
{
	Super::DrawHUD();
	if (!Canvas) { return; }

	AMatchGameMode* GM = GetWorld() ? GetWorld()->GetAuthGameMode<AMatchGameMode>() : nullptr;
	UFont* Big = GEngine ? GEngine->GetLargeFont() : nullptr;
	UFont* Small = GEngine ? GEngine->GetSmallFont() : nullptr;
	const float CX = Canvas->SizeX * 0.5f;
	const float W = Canvas->SizeX;
	const float H = Canvas->SizeY;

	if (GM)
	{
		const FString Score = FString::Printf(TEXT("HOME  %d - %d  AWAY"), GM->HomeScore, GM->AwayScore);
		const int32 M = FMath::FloorToInt(GM->MatchClock / 60.f);
		const int32 S = FMath::FloorToInt(FMath::Fmod(GM->MatchClock, 60.f));
		DrawText(Score, FLinearColor::White, CX - 110.f, 24.f, Big, 1.4f);
		DrawText(FString::Printf(TEXT("%02d:%02d"), M, S), FLinearColor(1.f, 0.84f, 0.25f), CX - 26.f, 56.f, Big, 1.2f);

		if (GM->bEnded)
		{
			DrawRect(FLinearColor(0.f, 0.f, 0.f, 0.6f), CX - 360.f, H * 0.42f, 720.f, 70.f);
			DrawText(GM->ResultText, FLinearColor(1.f, 0.9f, 0.6f), CX - 340.f, H * 0.45f, Big, 1.2f);
		}
	}

	DrawText(TEXT("WASD/Stick move  Shift/RT sprint  Space shoot  E pass"),
		FLinearColor(0.85f, 0.93f, 1.f), 20.f, H - 28.f, Small, 1.0f);

	// —— 触屏虚拟摇杆 + 按钮(读玩家球员状态)——
	AFootballer* Player = GetOwningPlayerController() ? Cast<AFootballer>(GetOwningPlayerController()->GetPawn()) : nullptr;
	if (Player && Player->IsJoyActive())
	{
		const FVector2D C = Player->GetJoyStart();
		const FVector2D V = Player->GetJoyVec();
		DrawRect(FLinearColor(1.f, 1.f, 1.f, 0.12f), C.X - 90.f, C.Y - 90.f, 180.f, 180.f);
		DrawRect(FLinearColor(0.25f, 0.77f, 0.42f, 0.6f), C.X + V.X * 90.f - 30.f, C.Y + V.Y * 90.f - 30.f, 60.f, 60.f);
	}
	// 右侧按钮提示(始终绘制)
	auto Btn = [&](float bx, float by, float r, const FLinearColor& col, const FString& label)
	{
		DrawRect(col, bx - r, by - r, r * 2.f, r * 2.f);
		DrawText(label, FLinearColor::White, bx - 18.f, by - 8.f, Small, 1.0f);
	};
	Btn(W - 130.f, H - 130.f, 50.f, FLinearColor(0.12f, 0.43f, 0.92f, 0.5f), TEXT("射门"));
	Btn(W - 250.f, H - 110.f, 38.f, FLinearColor(0.15f, 0.77f, 0.42f, 0.5f), TEXT("传"));
	Btn(W - 170.f, H - 250.f, 38.f, FLinearColor(1.f, 0.42f, 0.21f, 0.5f), TEXT("冲"));
}
