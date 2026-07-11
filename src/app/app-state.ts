import { createContext, useContext } from "react";
import type { AiProvider } from "../ai/AiProvider";
import type { EigenraumSettings } from "../storage/settings-repository";

export type Route = "onboarding" | "home" | "morning" | "evening" | "history" | "settings";

export interface AppState {
  route: Route;
  navigate: (route: Route) => void;

  settings: EigenraumSettings;
  updateSettings: (patch: Partial<EigenraumSettings>) => Promise<void>;

  aiProvider: AiProvider;
  keyConfigured: boolean;
  refreshKeyConfigured: () => Promise<void>;
}

export const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const state = useContext(AppStateContext);
  if (!state) {
    throw new Error("useAppState außerhalb von AppProviders verwendet");
  }
  return state;
}
