import type { LocalDateKey } from "./date-key";

export const MORNING_NEEDS = [
  "ruhe",
  "freiheit",
  "naehe",
  "kreativitaet",
  "ordnung",
  "koerper",
  "klarheit",
  "schutzraum",
] as const;

export type MorningNeed = (typeof MORNING_NEEDS)[number];

export const MORNING_THREATS = [
  "termine",
  "erwartungen",
  "ablenkung",
  "bequemlichkeit",
  "konfliktvermeidung",
  "reizueberflutung",
  "fremdbestimmung",
  "selbstkritik",
] as const;

export type MorningThreat = (typeof MORNING_THREATS)[number];

export interface MorningCheckin {
  id: string;
  date: LocalDateKey;
  need: MorningNeed;
  threat: MorningThreat | null;
  permission: string;
  createdAt: string;
  updatedAt: string;
}

export const MORNING_NEED_LABELS: Record<MorningNeed, string> = {
  ruhe: "Ruhe",
  freiheit: "Freiheit",
  naehe: "Nähe",
  kreativitaet: "Kreativität",
  ordnung: "Ordnung",
  koerper: "Körper",
  klarheit: "Klarheit",
  schutzraum: "Schutzraum",
};

export const MORNING_THREAT_LABELS: Record<MorningThreat, string> = {
  termine: "Terminen",
  erwartungen: "Erwartungen",
  ablenkung: "Ablenkung",
  bequemlichkeit: "Bequemlichkeit",
  konfliktvermeidung: "Konfliktvermeidung",
  reizueberflutung: "Reizüberflutung",
  fremdbestimmung: "Fremdbestimmung",
  selbstkritik: "Selbstkritik",
};
