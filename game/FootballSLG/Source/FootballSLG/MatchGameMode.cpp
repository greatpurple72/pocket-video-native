#include "MatchGameMode.h"
#include "Footballer.h"

AMatchGameMode::AMatchGameMode()
{
	DefaultPawnClass = AFootballer::StaticClass();
}
