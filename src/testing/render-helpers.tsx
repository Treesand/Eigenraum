import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { AppStateContext, type AppState, type Route } from "../app/app-state";
import { DEFAULT_SETTINGS } from "../storage/settings-repository";
import { TestAiProvider } from "./mock-ai";

export interface TestAppStateOptions {
  route?: Route;
  provider?: TestAiProvider;
  keyConfigured?: boolean;
  settings?: Partial<AppState["settings"]>;
  navigate?: (route: Route) => void;
  updateSettings?: AppState["updateSettings"];
}

export function makeAppState(options: TestAppStateOptions = {}): AppState {
  const provider = options.provider ?? new TestAiProvider();
  return {
    route: options.route ?? "home",
    navigate: options.navigate ?? (() => undefined),
    settings: { ...DEFAULT_SETTINGS, ...options.settings },
    updateSettings: options.updateSettings ?? (async () => undefined),
    aiProvider: provider,
    keyConfigured: options.keyConfigured ?? true,
    refreshKeyConfigured: async () => undefined,
  };
}

export function renderWithAppState(ui: ReactNode, options: TestAppStateOptions = {}) {
  const state = makeAppState(options);
  return {
    state,
    ...render(<AppStateContext.Provider value={state}>{ui}</AppStateContext.Provider>),
  };
}
