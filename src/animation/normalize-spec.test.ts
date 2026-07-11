import { describe, expect, it } from "vitest";
import { hasKnownEnums, normalizeAnimationSpec } from "./normalize-spec";
import { makeAnimationSpec } from "../testing/fixtures";
import type { AnimationSpec } from "../domain/animation-spec";

describe("normalizeAnimationSpec", () => {
  it("klemmt extreme Werte in die erlaubten Bereiche", () => {
    const extreme = makeAnimationSpec({
      seed: 99_999_999_999,
      durationMs: 60_000,
      baseHue: 720,
      secondaryHueOffset: 999,
      saturation: 2,
      lightness: -1,
      contrast: 3,
      warmth: -7,
      centerBias: 12,
      negativeSpace: 0,
      symmetry: -4,
      layers: [
        {
          type: "blob",
          motion: "breathe",
          direction: "none",
          count: 500,
          size: 99,
          opacity: 5,
          speed: -3,
          softness: 42,
          rotation: 900,
        },
      ],
    });

    const normalized = normalizeAnimationSpec(extreme);

    expect(normalized.seed).toBe(2_147_483_647);
    expect(normalized.durationMs).toBe(5_000);
    expect(normalized.baseHue).toBe(359);
    expect(normalized.secondaryHueOffset).toBe(180);
    expect(normalized.saturation).toBe(0.65);
    expect(normalized.lightness).toBe(0.55);
    expect(normalized.contrast).toBe(0.55);
    expect(normalized.warmth).toBe(-1);
    expect(normalized.centerBias).toBe(1);
    expect(normalized.negativeSpace).toBe(0.25);
    expect(normalized.symmetry).toBe(0);

    const layer = normalized.layers[0]!;
    expect(layer.count).toBe(14);
    expect(layer.size).toBe(0.8);
    expect(layer.opacity).toBe(0.75);
    expect(layer.speed).toBe(0.05);
    expect(layer.softness).toBe(1);
    expect(layer.rotation).toBe(180);
  });

  it("behandelt NaN und Infinity ohne Absturz", () => {
    const broken = makeAnimationSpec({
      saturation: Number.NaN,
      lightness: Number.POSITIVE_INFINITY,
    });
    const normalized = normalizeAnimationSpec(broken);
    expect(normalized.saturation).toBe(0.15);
    expect(normalized.lightness).toBe(0.92);
  });

  it("begrenzt die Ebenenanzahl auf vier", () => {
    const layer = makeAnimationSpec().layers[0]!;
    const spec = makeAnimationSpec({ layers: [layer, layer, layer, layer, layer, layer] });
    expect(normalizeAnimationSpec(spec).layers).toHaveLength(4);
  });

  it("lässt gültige Werte unverändert", () => {
    const spec = makeAnimationSpec();
    const normalized = normalizeAnimationSpec(spec);
    expect(normalized.baseHue).toBe(spec.baseHue);
    expect(normalized.durationMs).toBe(spec.durationMs);
    expect(normalized.layers[0]!.opacity).toBe(spec.layers[0]!.opacity);
  });
});

describe("hasKnownEnums", () => {
  it("akzeptiert bekannte Enums", () => {
    expect(hasKnownEnums(makeAnimationSpec())).toBe(true);
  });

  it("erkennt unbekannten backgroundStyle", () => {
    const spec = {
      ...makeAnimationSpec(),
      backgroundStyle: "disco_lights",
    } as unknown as AnimationSpec;
    expect(hasKnownEnums(spec)).toBe(false);
  });

  it("erkennt unbekannte Layer-Enums", () => {
    const base = makeAnimationSpec();
    const spec = {
      ...base,
      layers: [{ ...base.layers[0]!, motion: "explode" }],
    } as unknown as AnimationSpec;
    expect(hasKnownEnums(spec)).toBe(false);
  });
});
