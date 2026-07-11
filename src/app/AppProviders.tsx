import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppStateContext, type Route } from "./app-state";
import { createAiProvider } from "../ai/provider-factory";
import {
  loadSettings,
  updateSettings as persistSettings,
  DEFAULT_SETTINGS,
  type EigenraumSettings,
} from "../storage/settings-repository";

export function AppProviders({ children }: { children: ReactNode }) {
  const [aiProvider] = useState(() => createAiProvider());
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>("home");
  const [settings, setSettings] = useState<EigenraumSettings>(DEFAULT_SETTINGS);
  const [keyConfigured, setKeyConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadSettings();
      let configured: boolean;
      try {
        configured = await aiProvider.isConfigured();
      } catch {
        configured = false;
      }
      if (cancelled) {
        return;
      }
      setSettings(loaded);
      setKeyConfigured(configured);
      setRoute(loaded.onboardingCompleted ? "home" : "onboarding");
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [aiProvider]);

  const updateSettings = useCallback(async (patch: Partial<EigenraumSettings>) => {
    const next = await persistSettings(patch);
    setSettings(next);
  }, []);

  const refreshKeyConfigured = useCallback(async () => {
    try {
      setKeyConfigured(await aiProvider.isConfigured());
    } catch {
      setKeyConfigured(false);
    }
  }, [aiProvider]);

  const value = useMemo(
    () => ({
      route,
      navigate: setRoute,
      settings,
      updateSettings,
      aiProvider,
      keyConfigured,
      refreshKeyConfigured,
    }),
    [route, settings, updateSettings, aiProvider, keyConfigured, refreshKeyConfigured],
  );

  if (!ready) {
    return null;
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
