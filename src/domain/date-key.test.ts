import { describe, expect, it } from "vitest";
import { addLocalDays, parseLocalDateKey, toLocalDateKey } from "./date-key";

describe("toLocalDateKey", () => {
  it("verwendet die lokale Zeit, nicht UTC", () => {
    // 2026-07-11 00:30 lokale Zeit – in UTC kann das noch der 10. sein.
    const date = new Date(2026, 6, 11, 0, 30);
    expect(toLocalDateKey(date)).toBe("2026-07-11");
  });

  it("polstert Monat und Tag mit führenden Nullen", () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("bleibt kurz vor Mitternacht beim selben lokalen Tag", () => {
    const date = new Date(2026, 6, 11, 23, 59, 59);
    expect(toLocalDateKey(date)).toBe("2026-07-11");
  });
});

describe("addLocalDays", () => {
  it("berechnet den Folgetag", () => {
    expect(addLocalDays("2026-07-11", 1)).toBe("2026-07-12");
  });

  it("wechselt über Monatsgrenzen", () => {
    expect(addLocalDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addLocalDays("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("wechselt über Jahresgrenzen", () => {
    expect(addLocalDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addLocalDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("behandelt Schaltjahre", () => {
    expect(addLocalDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addLocalDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("übersteht Sommerzeit-Umstellungen (Europa: letzter Sonntag im März)", () => {
    // In Zeitzonen mit DST existiert 2026-03-29 02:30 nicht;
    // die Mittags-Ankerzeit macht die Addition trotzdem stabil.
    expect(addLocalDays("2026-03-28", 1)).toBe("2026-03-29");
    expect(addLocalDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("übersteht Winterzeit-Umstellungen (letzter Sonntag im Oktober)", () => {
    expect(addLocalDays("2026-10-24", 1)).toBe("2026-10-25");
    expect(addLocalDays("2026-10-25", 1)).toBe("2026-10-26");
  });

  it("addiert auch größere Zeiträume korrekt", () => {
    expect(addLocalDays("2026-07-11", 365)).toBe("2027-07-11");
  });
});

describe("parseLocalDateKey", () => {
  it("wirft bei ungültigem Format", () => {
    expect(() => parseLocalDateKey("11.07.2026")).toThrow();
    expect(() => parseLocalDateKey("2026-7-1")).toThrow();
  });

  it("liefert ein Datum am selben lokalen Tag", () => {
    const date = parseLocalDateKey("2026-07-11");
    expect(toLocalDateKey(date)).toBe("2026-07-11");
  });
});
