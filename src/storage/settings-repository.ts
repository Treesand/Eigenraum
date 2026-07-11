import { DEFAULT_AI_MODEL } from "../ai/prompt-builder";
import { getDatabase } from "./database";

export interface EigenraumSettings {
  reducedMotion: boolean;
  aiModel: string;
  contextDepth: 0 | 1 | 3;
  onboardingCompleted: boolean;
}

export const DEFAULT_SETTINGS: EigenraumSettings = {
  reducedMotion: false,
  aiModel: DEFAULT_AI_MODEL,
  contextDepth: 3,
  onboardingCompleted: false,
};

const SETTINGS_KEY = "eigenraum-settings";

/**
 * Persistente App-Einstellungen. Der API-Key gehört bewusst
 * NICHT hierher – er liegt ausschließlich in Keychain/Keystore.
 */
export async function loadSettings(): Promise<EigenraumSettings> {
  const record = await getDatabase().settings.get(SETTINGS_KEY);
  if (!record || typeof record.value !== "object" || record.value === null) {
    return { ...DEFAULT_SETTINGS };
  }
  const stored = record.value as Partial<EigenraumSettings>;
  return {
    reducedMotion:
      typeof stored.reducedMotion === "boolean"
        ? stored.reducedMotion
        : DEFAULT_SETTINGS.reducedMotion,
    aiModel: typeof stored.aiModel === "string" ? stored.aiModel : DEFAULT_SETTINGS.aiModel,
    contextDepth:
      stored.contextDepth === 0 || stored.contextDepth === 1 || stored.contextDepth === 3
        ? stored.contextDepth
        : DEFAULT_SETTINGS.contextDepth,
    onboardingCompleted:
      typeof stored.onboardingCompleted === "boolean"
        ? stored.onboardingCompleted
        : DEFAULT_SETTINGS.onboardingCompleted,
  };
}

export async function saveSettings(settings: EigenraumSettings): Promise<void> {
  await getDatabase().settings.put({ key: SETTINGS_KEY, value: settings });
}

export async function updateSettings(
  patch: Partial<EigenraumSettings>,
): Promise<EigenraumSettings> {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}
