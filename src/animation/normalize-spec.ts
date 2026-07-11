import {
  BACKGROUND_STYLES,
  MOTION_DIRECTIONS,
  MOTION_TYPES,
  SHAPE_TYPES,
  type AnimationLayer,
  type AnimationSpec,
} from "../domain/animation-spec";

export const SPEC_LIMITS = {
  seed: { min: 0, max: 2_147_483_647 },
  durationMs: { min: 3_200, max: 5_000 },
  baseHue: { min: 0, max: 359 },
  secondaryHueOffset: { min: -180, max: 180 },
  saturation: { min: 0.15, max: 0.65 },
  lightness: { min: 0.55, max: 0.92 },
  contrast: { min: 0.05, max: 0.55 },
  warmth: { min: -1, max: 1 },
  centerBias: { min: 0, max: 1 },
  negativeSpace: { min: 0.25, max: 0.85 },
  symmetry: { min: 0, max: 1 },
  layerCount: { min: 1, max: 4 },
  count: { min: 1, max: 14 },
  size: { min: 0.05, max: 0.8 },
  opacity: { min: 0.05, max: 0.75 },
  speed: { min: 0.05, max: 1 },
  softness: { min: 0, max: 1 },
  rotation: { min: -180, max: 180 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  // ±Infinity wird durch min/max korrekt auf die Bereichsgrenzen gezogen.
  return Math.min(max, Math.max(min, value));
}

function clampTo(value: number, limits: { min: number; max: number }): number {
  return clamp(value, limits.min, limits.max);
}

/**
 * Prüft, ob alle Enum-Felder eines (bereits strukturell validierten)
 * Specs bekannte Werte tragen. Unbekannte Enums führen nicht zum
 * Absturz, sondern beim Aufrufer zum lokalen Fallback-Artefakt.
 */
export function hasKnownEnums(spec: AnimationSpec): boolean {
  if (!(BACKGROUND_STYLES as readonly string[]).includes(spec.backgroundStyle)) {
    return false;
  }
  return spec.layers.every(
    (layer) =>
      (SHAPE_TYPES as readonly string[]).includes(layer.type) &&
      (MOTION_TYPES as readonly string[]).includes(layer.motion) &&
      (MOTION_DIRECTIONS as readonly string[]).includes(layer.direction),
  );
}

function normalizeLayer(layer: AnimationLayer): AnimationLayer {
  return {
    type: layer.type,
    motion: layer.motion,
    direction: layer.direction,
    count: Math.round(clampTo(layer.count, SPEC_LIMITS.count)),
    size: clampTo(layer.size, SPEC_LIMITS.size),
    opacity: clampTo(layer.opacity, SPEC_LIMITS.opacity),
    speed: clampTo(layer.speed, SPEC_LIMITS.speed),
    softness: clampTo(layer.softness, SPEC_LIMITS.softness),
    rotation: clampTo(layer.rotation, SPEC_LIMITS.rotation),
  };
}

/**
 * Klemmt jedes empfangene Spec in die erlaubten Wertebereiche.
 * Die Enum-Prüfung geschieht vorab über Zod bzw. hasKnownEnums.
 */
export function normalizeAnimationSpec(spec: AnimationSpec): AnimationSpec {
  return {
    version: 1,
    seed: Math.round(clampTo(spec.seed, SPEC_LIMITS.seed)),
    durationMs: Math.round(clampTo(spec.durationMs, SPEC_LIMITS.durationMs)),
    backgroundStyle: spec.backgroundStyle,
    baseHue: Math.round(clampTo(spec.baseHue, SPEC_LIMITS.baseHue)),
    secondaryHueOffset: clampTo(spec.secondaryHueOffset, SPEC_LIMITS.secondaryHueOffset),
    saturation: clampTo(spec.saturation, SPEC_LIMITS.saturation),
    lightness: clampTo(spec.lightness, SPEC_LIMITS.lightness),
    contrast: clampTo(spec.contrast, SPEC_LIMITS.contrast),
    warmth: clampTo(spec.warmth, SPEC_LIMITS.warmth),
    centerBias: clampTo(spec.centerBias, SPEC_LIMITS.centerBias),
    negativeSpace: clampTo(spec.negativeSpace, SPEC_LIMITS.negativeSpace),
    symmetry: clampTo(spec.symmetry, SPEC_LIMITS.symmetry),
    layers: spec.layers.slice(0, SPEC_LIMITS.layerCount.max).map(normalizeLayer),
  };
}
