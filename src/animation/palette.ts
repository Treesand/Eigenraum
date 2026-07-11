import type { AnimationSpec } from "../domain/animation-spec";

export interface ArtifactPalette {
  background: string;
  backgroundEdge: string;
  primary: string;
  secondary: string;
  accent: string;
}

function wrapHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export function hsl(hue: number, saturation: number, lightness: number, alpha = 1): string {
  const h = wrapHue(hue).toFixed(1);
  const s = (saturation * 100).toFixed(1);
  const l = (lightness * 100).toFixed(1);
  return alpha >= 1 ? `hsl(${h} ${s}% ${l}%)` : `hsl(${h} ${s}% ${l}% / ${alpha.toFixed(3)})`;
}

/**
 * Leitet aus einem Spec eine kleine, ruhige Palette ab.
 * warmth verschiebt den Farbton leicht Richtung warm (+) oder kühl (-).
 */
export function paletteFromSpec(spec: AnimationSpec): ArtifactPalette {
  const warmthShift = spec.warmth * 14;
  const baseHue = wrapHue(spec.baseHue + warmthShift);
  const secondaryHue = wrapHue(baseHue + spec.secondaryHueOffset);

  const bgLightness = Math.min(0.97, spec.lightness + 0.06);
  const shapeLightness = Math.max(0.3, spec.lightness - spec.contrast * 0.55);

  return {
    background: hsl(baseHue, spec.saturation * 0.35, bgLightness),
    backgroundEdge: hsl(baseHue, spec.saturation * 0.45, bgLightness - 0.05),
    primary: hsl(baseHue, spec.saturation, shapeLightness),
    secondary: hsl(secondaryHue, spec.saturation * 0.85, shapeLightness + 0.08),
    accent: hsl(secondaryHue, Math.min(0.65, spec.saturation * 1.1), shapeLightness - 0.06),
  };
}
