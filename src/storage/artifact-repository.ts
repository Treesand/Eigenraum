import type { LocalDateKey } from "../domain/date-key";
import type { MorningArtifact } from "../domain/morning-artifact";
import { getDatabase } from "./database";

/**
 * Pro Zieldatum gibt es höchstens ein Artefakt – ein neues für
 * denselben Tag ersetzt das bestehende (gleiche id wird beibehalten).
 */
export async function upsertArtifactForDate(
  artifact: MorningArtifact,
): Promise<MorningArtifact> {
  const db = getDatabase();
  return db.transaction("rw", db.morningArtifacts, async () => {
    const existing = await db.morningArtifacts
      .where("targetDate")
      .equals(artifact.targetDate)
      .first();

    const toStore: MorningArtifact = existing
      ? { ...artifact, id: existing.id, createdAt: existing.createdAt }
      : artifact;

    await db.morningArtifacts.put(toStore);
    return toStore;
  });
}

export async function getArtifactByDate(
  targetDate: LocalDateKey,
): Promise<MorningArtifact | undefined> {
  return getDatabase().morningArtifacts.where("targetDate").equals(targetDate).first();
}

export async function listArtifacts(): Promise<MorningArtifact[]> {
  return getDatabase().morningArtifacts.orderBy("targetDate").reverse().toArray();
}

/** Die letzten abgeschlossenen Artefakte vor einem Datum (für recentContext). */
export async function listArtifactsBefore(
  targetDate: LocalDateKey,
  limit: number,
): Promise<MorningArtifact[]> {
  const all = await getDatabase().morningArtifacts.orderBy("targetDate").reverse().toArray();
  return all
    .filter(
      (artifact) =>
        artifact.targetDate < targetDate &&
        (artifact.status === "generated" || artifact.status === "fallback"),
    )
    .slice(0, limit);
}
