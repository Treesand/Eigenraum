import type { LocalDateKey } from "./date-key";

export const EVENING_STATES = [
  "verbunden",
  "ruhig",
  "klar",
  "zerstreut",
  "ueberfordert",
  "eingeengt",
  "erschoepft",
  "unruhig",
  "fremdbestimmt",
  "leer",
  "gemischt",
] as const;

export type EveningState = (typeof EVENING_STATES)[number];

export type EveningIntensity = 1 | 2 | 3 | 4 | 5;

export interface EveningCheckout {
  id: string;
  date: LocalDateKey;

  momentWithSelf: string;
  momentOfLeavingSelf: string;
  whatHelped: string;
  whatWasMissing: string;

  state: EveningState;
  intensity: EveningIntensity;

  createdAt: string;
  updatedAt: string;
}

export const EVENING_STATE_LABELS: Record<EveningState, string> = {
  verbunden: "Verbunden",
  ruhig: "Ruhig",
  klar: "Klar",
  zerstreut: "Zerstreut",
  ueberfordert: "Überfordert",
  eingeengt: "Eingeengt",
  erschoepft: "Erschöpft",
  unruhig: "Unruhig",
  fremdbestimmt: "Fremdbestimmt",
  leer: "Leer",
  gemischt: "Gemischt",
};

/**
 * Mindestens eines der vier Textfelder muss ausgefüllt sein.
 */
export function hasAtLeastOneCheckoutText(checkout: {
  momentWithSelf: string;
  momentOfLeavingSelf: string;
  whatHelped: string;
  whatWasMissing: string;
}): boolean {
  return [
    checkout.momentWithSelf,
    checkout.momentOfLeavingSelf,
    checkout.whatHelped,
    checkout.whatWasMissing,
  ].some((text) => text.trim().length > 0);
}
