import type { LocalDateKey } from "../domain/date-key";
import type { MorningCheckin, MorningNeed, MorningThreat } from "../domain/morning-checkin";
import { createId } from "../domain/id";
import { getDatabase } from "./database";

export interface MorningCheckinDraft {
  date: LocalDateKey;
  need: MorningNeed;
  threat: MorningThreat | null;
  permission: string;
}

/**
 * Pro Tag höchstens ein Morgen-Check-in – erneutes Speichern
 * aktualisiert den bestehenden Datensatz.
 */
export async function saveMorningCheckin(draft: MorningCheckinDraft): Promise<MorningCheckin> {
  const db = getDatabase();
  const now = new Date().toISOString();

  return db.transaction("rw", db.morningCheckins, async () => {
    const existing = await db.morningCheckins.where("date").equals(draft.date).first();

    if (existing) {
      const updated: MorningCheckin = {
        ...existing,
        need: draft.need,
        threat: draft.threat,
        permission: draft.permission.trim(),
        updatedAt: now,
      };
      await db.morningCheckins.put(updated);
      return updated;
    }

    const checkin: MorningCheckin = {
      id: createId(),
      date: draft.date,
      need: draft.need,
      threat: draft.threat,
      permission: draft.permission.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await db.morningCheckins.put(checkin);
    return checkin;
  });
}

export async function getMorningCheckinByDate(
  date: LocalDateKey,
): Promise<MorningCheckin | undefined> {
  return getDatabase().morningCheckins.where("date").equals(date).first();
}

export async function listMorningCheckins(): Promise<MorningCheckin[]> {
  return getDatabase().morningCheckins.orderBy("date").reverse().toArray();
}
