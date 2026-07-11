/**
 * Ein lokaler Kalendertag im Format YYYY-MM-DD, immer in der
 * Gerätezeitzone bestimmt – niemals über UTC/toISOString, da das
 * rund um Mitternacht den falschen Tag ergeben kann.
 */
export type LocalDateKey = string;

export function toLocalDateKey(date: Date): LocalDateKey {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: LocalDateKey): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Ungültiger LocalDateKey: ${dateKey}`);
  }
  const [, year, month, day] = match;
  // Mittag als Ankerzeit: robust gegenüber DST-Umstellungen,
  // bei denen 00:00 lokal nicht existiert oder doppelt vorkommt.
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
}

export function addLocalDays(dateKey: LocalDateKey, days: number): LocalDateKey {
  const anchor = parseLocalDateKey(dateKey);
  anchor.setDate(anchor.getDate() + days);
  return toLocalDateKey(anchor);
}

export function todayLocalDateKey(now: Date = new Date()): LocalDateKey {
  return toLocalDateKey(now);
}

export function compareLocalDateKeys(a: LocalDateKey, b: LocalDateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
