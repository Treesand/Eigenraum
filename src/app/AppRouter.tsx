import { useAppState } from "./app-state";
import { OnboardingScreen } from "../features/onboarding/OnboardingScreen";
import { HomeScreen } from "../features/home/HomeScreen";
import { MorningCheckinScreen } from "../features/morning/MorningCheckinScreen";
import { EveningCheckoutScreen } from "../features/evening/EveningCheckoutScreen";
import { HistoryScreen } from "../features/history/HistoryScreen";
import { SettingsScreen } from "../features/settings/SettingsScreen";

export function AppRouter() {
  const { route } = useAppState();

  switch (route) {
    case "onboarding":
      return <OnboardingScreen />;
    case "morning":
      return <MorningCheckinScreen />;
    case "evening":
      return <EveningCheckoutScreen />;
    case "history":
      return <HistoryScreen />;
    case "settings":
      return <SettingsScreen />;
    case "home":
      return <HomeScreen />;
  }
}
