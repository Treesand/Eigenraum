import Dexie, { type Table } from "dexie";
import type { MorningCheckin } from "../domain/morning-checkin";
import type { EveningCheckout } from "../domain/evening-checkout";
import type { MorningArtifact } from "../domain/morning-artifact";

export interface AppSetting {
  key: string;
  value: unknown;
}

export class EigenraumDatabase extends Dexie {
  morningCheckins!: Table<MorningCheckin, string>;
  eveningCheckouts!: Table<EveningCheckout, string>;
  morningArtifacts!: Table<MorningArtifact, string>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super("eigenraum");

    this.version(1).stores({
      morningCheckins: "id, date, createdAt",
      eveningCheckouts: "id, date, createdAt",
      morningArtifacts: "id, targetDate, sourceCheckoutId, status, createdAt",
      settings: "key",
    });
  }
}

let instance: EigenraumDatabase | null = null;

export function getDatabase(): EigenraumDatabase {
  if (!instance) {
    instance = new EigenraumDatabase();
  }
  return instance;
}

/** Nur für Tests: erzwingt eine frische Datenbankinstanz. */
export function resetDatabaseInstanceForTests(): void {
  instance = null;
}
