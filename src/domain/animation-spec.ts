export const BACKGROUND_STYLES = [
  "quiet_field",
  "soft_halo",
  "morning_mist",
  "paper_light",
  "wide_gradient",
] as const;

export type BackgroundStyle = (typeof BACKGROUND_STYLES)[number];

export const SHAPE_TYPES = ["blob", "ring", "ribbon", "petal", "line", "particles"] as const;

export type ShapeType = (typeof SHAPE_TYPES)[number];

export const MOTION_TYPES = [
  "gather",
  "unfold",
  "breathe",
  "drift_up",
  "settle",
  "orbit_slow",
  "open_space",
] as const;

export type MotionType = (typeof MOTION_TYPES)[number];

export const MOTION_DIRECTIONS = [
  "center",
  "outward",
  "upward",
  "left_to_right",
  "none",
] as const;

export type MotionDirection = (typeof MOTION_DIRECTIONS)[number];

export interface AnimationLayer {
  type: ShapeType;
  motion: MotionType;
  direction: MotionDirection;

  count: number;
  size: number;
  opacity: number;
  speed: number;
  softness: number;
  rotation: number;
}

export interface AnimationSpec {
  version: 1;
  seed: number;
  durationMs: number;

  backgroundStyle: BackgroundStyle;

  baseHue: number;
  secondaryHueOffset: number;
  saturation: number;
  lightness: number;
  contrast: number;
  warmth: number;

  centerBias: number;
  negativeSpace: number;
  symmetry: number;

  layers: AnimationLayer[];
}
