import { describe, expect, it } from "vitest";
import {
  buildFallbackAnimationSpec,
  createFallbackArtifact,
  createNeutralArtifact,
  fallbackMap,
  NEUTRAL_MORNING_PHRASE,
} from "./fallback-spec";
import { EVENING_STATES } from "../domain/evening-checkout";
import { SPEC_LIMITS } from "./normalize-spec";
import { hasKnownEnums } from "./normalize-spec";
import { makeCheckout } from "../testing/fixtures";
import { PHRASE_MAX_LENGTH } from "../domain/morning-artifact";

describe("fallbackMap", () => {
  it("deckt alle Abendzustände ab", () => {
    for (const state of EVENING_STATES) {
      expect(fallbackMap[state]).toBeDefined();
    }
  });

  it("bildet die konträre Logik ab", () => {
    expect(fallbackMap.ueberfordert.targetQuality).toBe("grounding");
    expect(fallbackMap.ueberfordert.motion).toBe("gather");
    expect(fallbackMap.eingeengt.targetQuality).toBe("spaciousness");
    expect(fallbackMap.eingeengt.motion).toBe("unfold");
    expect(fallbackMap.fremdbestimmt.targetQuality).toBe("boundary");
    expect(fallbackMap.leer.targetQuality).toBe("gentle_activation");
    expect(fallbackMap.leer.motion).toBe("drift_up");
    // Verbundenheit/Ruhe werden nicht korrigiert, sondern fortgeführt.
    expect(fallbackMap.verbunden.targetQuality).toBe("continuity");
    expect(fallbackMap.ruhig.targetQuality).toBe("continuity");
  });

  it("hält alle Phrasen im Zielumfang", () => {
    for (const state of EVENING_STATES) {
      const phrase = fallbackMap[state].phrase;
      expect(phrase.length).toBeLessThanOrEqual(PHRASE_MAX_LENGTH);
      expect(phrase).not.toContain("!");
      const words = phrase.split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(4);
      expect(words).toBeLessThanOrEqual(11);
    }
  });
});

describe("buildFallbackAnimationSpec", () => {
  it("ist deterministisch für denselben Seed", () => {
    const a = buildFallbackAnimationSpec("unruhig", 12345);
    const b = buildFallbackAnimationSpec("unruhig", 12345);
    expect(a).toEqual(b);
  });

  it("erzeugt für jeden Zustand ein gültiges, normalisiertes Spec", () => {
    for (const state of EVENING_STATES) {
      const spec = buildFallbackAnimationSpec(state, 999);
      expect(hasKnownEnums(spec)).toBe(true);
      expect(spec.durationMs).toBeGreaterThanOrEqual(SPEC_LIMITS.durationMs.min);
      expect(spec.durationMs).toBeLessThanOrEqual(SPEC_LIMITS.durationMs.max);
      expect(spec.layers.length).toBeGreaterThanOrEqual(1);
      expect(spec.layers.length).toBeLessThanOrEqual(4);
      expect(spec.negativeSpace).toBeGreaterThanOrEqual(SPEC_LIMITS.negativeSpace.min);
    }
  });

  it("nutzt die Motion aus der Zuordnung", () => {
    const spec = buildFallbackAnimationSpec("ueberfordert", 5);
    expect(spec.layers.every((layer) => layer.motion === "gather")).toBe(true);
  });
});

describe("createFallbackArtifact", () => {
  it("ist deterministisch: gleicher Checkout + Zieldatum ⇒ gleiche Animation", () => {
    const checkout = makeCheckout();
    const a = createFallbackArtifact(checkout, "2026-07-12");
    const b = createFallbackArtifact(checkout, "2026-07-12");
    expect(a.animation).toEqual(b.animation);
    expect(a.phrase).toBe(b.phrase);
  });

  it("variiert mit dem Zieldatum", () => {
    const checkout = makeCheckout();
    const a = createFallbackArtifact(checkout, "2026-07-12");
    const b = createFallbackArtifact(checkout, "2026-07-13");
    expect(a.animation.seed).not.toBe(b.animation.seed);
  });

  it("setzt Status, Version und Quelle korrekt", () => {
    const checkout = makeCheckout();
    const artifact = createFallbackArtifact(checkout, "2026-07-12");
    expect(artifact.status).toBe("fallback");
    expect(artifact.model).toBeNull();
    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.sourceCheckoutId).toBe(checkout.id);
    expect(artifact.targetDate).toBe("2026-07-12");
    expect(artifact.promptVersion).toBe("morning-artifact-v1");
  });
});

describe("createNeutralArtifact", () => {
  it("nutzt den neutralen Satz und funktioniert ohne Checkout", () => {
    const artifact = createNeutralArtifact("2026-07-11");
    expect(artifact.phrase).toBe(NEUTRAL_MORNING_PHRASE);
    expect(artifact.phrase).toBe("Du musst dich heute nicht sofort erklären.");
    expect(artifact.sourceCheckoutId).toBe("");
    expect(hasKnownEnums(artifact.animation)).toBe(true);
  });
});
