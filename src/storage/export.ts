import { getDatabase } from "./database";
import { loadSettings } from "./settings-repository";

export interface EigenraumExport {
  app: "eigenraum";
  exportVersion: 1;
  exportedAt: string;
  settings: unknown;
  morningCheckins: unknown[];
  eveningCheckouts: unknown[];
  morningArtifacts: unknown[];
}

/**
 * Exportiert alle lokalen Daten als JSON-Objekt.
 * Der API-Key ist hier prinzipbedingt nicht enthalten –
 * er liegt nicht in IndexedDB.
 */
export async function exportAllData(): Promise<EigenraumExport> {
  const db = getDatabase();
  const [settings, morningCheckins, eveningCheckouts, morningArtifacts] = await Promise.all([
    loadSettings(),
    db.morningCheckins.toArray(),
    db.eveningCheckouts.toArray(),
    db.morningArtifacts.toArray(),
  ]);

  return {
    app: "eigenraum",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    settings,
    morningCheckins,
    eveningCheckouts,
    morningArtifacts,
  };
}

/** Löscht alle lokalen Anwendungsdaten (nicht den nativen API-Key). */
export async function deleteAllData(): Promise<void> {
  const db = getDatabase();
  await db.transaction(
    "rw",
    [db.morningCheckins, db.eveningCheckouts, db.morningArtifacts, db.settings],
    async () => {
      await Promise.all([
        db.morningCheckins.clear(),
        db.eveningCheckouts.clear(),
        db.morningArtifacts.clear(),
        db.settings.clear(),
      ]);
    },
  );
}
