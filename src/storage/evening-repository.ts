import type { LocalDateKey } from "../domain/date-key";
import type {
  EveningCheckout,
  EveningIntensity,
  EveningState,
} from "../domain/evening-checkout";
import { hasAtLeastOneCheckoutText } from "../domain/evening-checkout";
import { createId } from "../domain/id";
import { getDatabase } from "./database";

export interface EveningCheckoutDraft {
  date: LocalDateKey;
  momentWithSelf: string;
  momentOfLeavingSelf: string;
  whatHelped: string;
  whatWasMissing: string;
  state: EveningState;
  intensity: EveningIntensity;
}

/**
 * Pro Tag höchstens ein Abend-Checkout – erneutes Speichern
 * aktualisiert den bestehenden Datensatz. Mindestens eines der
 * vier Textfelder muss ausgefüllt sein.
 */
export async function saveEveningCheckout(
  draft: EveningCheckoutDraft,
): Promise<EveningCheckout> {
  if (!hasAtLeastOneCheckoutText(draft)) {
    throw new Error("CHECKOUT_TEXT_REQUIRED");
  }

  const db = getDatabase();
  const now = new Date().toISOString();

  return db.transaction("rw", db.eveningCheckouts, async () => {
    const existing = await db.eveningCheckouts.where("date").equals(draft.date).first();

    if (existing) {
      const updated: EveningCheckout = {
        ...existing,
        momentWithSelf: draft.momentWithSelf.trim(),
        momentOfLeavingSelf: draft.momentOfLeavingSelf.trim(),
        whatHelped: draft.whatHelped.trim(),
        whatWasMissing: draft.whatWasMissing.trim(),
        state: draft.state,
        intensity: draft.intensity,
        updatedAt: now,
      };
      await db.eveningCheckouts.put(updated);
      return updated;
    }

    const checkout: EveningCheckout = {
      id: createId(),
      date: draft.date,
      momentWithSelf: draft.momentWithSelf.trim(),
      momentOfLeavingSelf: draft.momentOfLeavingSelf.trim(),
      whatHelped: draft.whatHelped.trim(),
      whatWasMissing: draft.whatWasMissing.trim(),
      state: draft.state,
      intensity: draft.intensity,
      createdAt: now,
      updatedAt: now,
    };
    await db.eveningCheckouts.put(checkout);
    return checkout;
  });
}

export async function getEveningCheckoutByDate(
  date: LocalDateKey,
): Promise<EveningCheckout | undefined> {
  return getDatabase().eveningCheckouts.where("date").equals(date).first();
}

/** Die letzten Checkouts vor einem Datum, absteigend sortiert. */
export async function listEveningCheckoutsBefore(
  date: LocalDateKey,
  limit: number,
): Promise<EveningCheckout[]> {
  const all = await getDatabase().eveningCheckouts.orderBy("date").reverse().toArray();
  return all.filter((checkout) => checkout.date < date).slice(0, limit);
}

export async function listEveningCheckouts(): Promise<EveningCheckout[]> {
  return getDatabase().eveningCheckouts.orderBy("date").reverse().toArray();
}
