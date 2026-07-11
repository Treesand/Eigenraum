import { describe, expect, it } from "vitest";
import { clampPhrase, PHRASE_MAX_LENGTH } from "./morning-artifact";

describe("clampPhrase", () => {
  it("trimmt Leerraum und normalisiert innere Abstände", () => {
    expect(clampPhrase("  Ruhe ist   keine Verhandlungsmasse.  ")).toBe(
      "Ruhe ist keine Verhandlungsmasse.",
    );
  });

  it("lässt kurze Phrasen unangetastet", () => {
    const phrase = "Nicht alles, was zieht, ist wichtig.";
    expect(clampPhrase(phrase)).toBe(phrase);
  });

  it("kürzt lange Phrasen auf höchstens 90 Zeichen", () => {
    const long = "Ein sehr langer Satz, der weit über die erlaubte Länge hinausgeht, ".repeat(4);
    const clamped = clampPhrase(long);
    expect(clamped.length).toBeLessThanOrEqual(PHRASE_MAX_LENGTH);
    expect(clamped.endsWith("…")).toBe(true);
  });

  it("kürzt möglichst an einer Wortgrenze", () => {
    const long = `${"Wort ".repeat(30)}Ende`;
    const clamped = clampPhrase(long);
    expect(clamped.length).toBeLessThanOrEqual(PHRASE_MAX_LENGTH);
    // kein abgeschnittenes halbes Wort vor dem Auslassungszeichen
    expect(clamped).toMatch(/Wort…$/);
  });

  it("liefert für leere Eingaben eine leere Zeichenkette", () => {
    expect(clampPhrase("   ")).toBe("");
  });
});
