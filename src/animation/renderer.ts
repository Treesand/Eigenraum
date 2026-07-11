import type { AnimationLayer, AnimationSpec } from "../domain/animation-spec";
import { mulberry32, randomBetween, type SeededRandom } from "./seeded-random";
import { paletteFromSpec, hsl, type ArtifactPalette } from "./palette";

/**
 * Der Renderer ist deterministisch: buildScene erzeugt aus dem Spec-Seed
 * einmalig alle Elementparameter; renderFrame ist danach eine reine
 * Funktion von (Szene, t). Math.random() wird nie verwendet.
 */

interface SceneElement {
  // Basisposition in relativen Koordinaten (0..1)
  x: number;
  y: number;
  size: number;
  phase: number;
  drift: number;
  wobble: number[];
}

interface SceneLayer {
  spec: AnimationLayer;
  elements: SceneElement[];
}

export interface Scene {
  spec: AnimationSpec;
  palette: ArtifactPalette;
  layers: SceneLayer[];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function buildElements(
  layer: AnimationLayer,
  spec: AnimationSpec,
  random: SeededRandom,
): SceneElement[] {
  const elements: SceneElement[] = [];
  const spread = 0.5 * (1 - spec.centerBias * 0.7);

  for (let i = 0; i < layer.count; i += 1) {
    let x: number;
    let y: number;

    if (spec.symmetry > 0.5 && layer.count > 1) {
      // Symmetrische Anordnung um die Mitte
      const angle = (i / layer.count) * Math.PI * 2 + randomBetween(random, -0.2, 0.2);
      const radius = randomBetween(random, 0.08, spread);
      x = 0.5 + Math.cos(angle) * radius;
      y = 0.5 + Math.sin(angle) * radius * 0.85;
    } else {
      x = 0.5 + randomBetween(random, -spread, spread);
      y = 0.5 + randomBetween(random, -spread, spread) * 0.85;
    }

    elements.push({
      x,
      y,
      size: layer.size * randomBetween(random, 0.7, 1.15),
      phase: randomBetween(random, 0, Math.PI * 2),
      drift: randomBetween(random, 0.6, 1),
      wobble: [
        randomBetween(random, 0.04, 0.11),
        randomBetween(random, 0.02, 0.07),
        randomBetween(random, 0, Math.PI * 2),
        randomBetween(random, 0, Math.PI * 2),
      ],
    });
  }
  return elements;
}

export function buildScene(spec: AnimationSpec): Scene {
  const random = mulberry32(spec.seed);
  return {
    spec,
    palette: paletteFromSpec(spec),
    layers: spec.layers.map((layer) => ({
      spec: layer,
      elements: buildElements(layer, spec, random),
    })),
  };
}

interface MotionState {
  offsetX: number;
  offsetY: number;
  scale: number;
  alpha: number;
  angle: number;
}

/**
 * Bewegungszustand eines Elements zum Zeitpunkt t (0..1).
 * Alle Bewegungen kommen bei t=1 vollständig zur Ruhe.
 */
function motionAt(layer: AnimationLayer, element: SceneElement, t: number): MotionState {
  const m = easeInOutCubic(t);
  const rest = 1 - easeOutCubic(t); // klingt gegen Ende aus
  const speed = layer.speed;
  const state: MotionState = { offsetX: 0, offsetY: 0, scale: 1, alpha: 1, angle: 0 };

  const directionSign =
    layer.direction === "left_to_right" ? 1 : layer.direction === "outward" ? 1 : -1;

  switch (layer.motion) {
    case "gather": {
      // Von außen zur Basisposition sammeln
      const distance = 0.22 * element.drift * (1 - m);
      state.offsetX = Math.cos(element.phase) * distance;
      state.offsetY = Math.sin(element.phase) * distance;
      state.alpha = 0.4 + 0.6 * m;
      break;
    }
    case "unfold": {
      state.scale = 0.55 + 0.45 * m;
      state.alpha = 0.3 + 0.7 * m;
      state.angle = (1 - m) * 0.35 * directionSign;
      break;
    }
    case "breathe": {
      const cycles = 1.5 + speed * 1.5;
      const amplitude = 0.05 * rest + 0.015;
      state.scale = 1 + amplitude * Math.sin(t * Math.PI * 2 * cycles + element.phase);
      break;
    }
    case "drift_up": {
      state.offsetY = 0.16 * element.drift * (1 - m);
      state.alpha = 0.35 + 0.65 * m;
      break;
    }
    case "settle": {
      state.offsetY = -0.12 * element.drift * (1 - m);
      state.scale = 1 + 0.08 * (1 - m);
      state.alpha = 0.45 + 0.55 * m;
      break;
    }
    case "orbit_slow": {
      state.angle = speed * 0.8 * m * (element.drift > 0.8 ? 1 : -1);
      break;
    }
    case "open_space": {
      const spreadOut = 0.1 * m * element.drift;
      state.offsetX = Math.cos(element.phase) * spreadOut;
      state.offsetY = Math.sin(element.phase) * spreadOut * 0.7;
      state.scale = 0.92 + 0.08 * m;
      state.alpha = 0.5 + 0.5 * m;
      break;
    }
  }

  if (layer.direction === "left_to_right") {
    state.offsetX += (m - 1) * 0.1;
  } else if (layer.direction === "upward" && layer.motion !== "drift_up") {
    state.offsetY += (1 - m) * 0.08;
  }

  return state;
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  width: number,
  height: number,
): void {
  const { spec, palette } = scene;
  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  switch (spec.backgroundStyle) {
    case "quiet_field": {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, palette.background);
      gradient.addColorStop(1, palette.backgroundEdge);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "soft_halo": {
      const radius = Math.max(width, height) * 0.75;
      const gradient = ctx.createRadialGradient(
        width / 2,
        height * 0.42,
        radius * 0.05,
        width / 2,
        height * 0.42,
        radius,
      );
      gradient.addColorStop(0, hsl(spec.baseHue, spec.saturation * 0.3, 0.96));
      gradient.addColorStop(1, palette.backgroundEdge);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "morning_mist": {
      const bands = 4;
      for (let i = 0; i < bands; i += 1) {
        const y = (i / bands) * height;
        const gradient = ctx.createLinearGradient(0, y, 0, y + height / bands);
        gradient.addColorStop(0, hsl(spec.baseHue, spec.saturation * 0.25, 0.93, 0.5));
        gradient.addColorStop(1, hsl(spec.baseHue, spec.saturation * 0.3, 0.88, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, y, width, height / bands);
      }
      break;
    }
    case "paper_light": {
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.8,
      );
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(1, "rgba(37, 40, 34, 0.05)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      break;
    }
    case "wide_gradient": {
      const gradient = ctx.createLinearGradient(0, height, width, 0);
      gradient.addColorStop(0, palette.backgroundEdge);
      gradient.addColorStop(1, palette.background);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      break;
    }
  }
}

function blobPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  element: SceneElement,
  angle: number,
): void {
  const [a1, a2, p1, p2] = element.wobble as [number, number, number, number];
  ctx.beginPath();
  const steps = 48;
  for (let i = 0; i <= steps; i += 1) {
    const theta = (i / steps) * Math.PI * 2;
    const r =
      radius *
      (1 + a1 * Math.sin(theta * 2 + p1 + angle) + a2 * Math.sin(theta * 3 + p2 - angle));
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

function fillSoft(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
  softness: number,
): void {
  const outer = radius * (1 + softness * 0.9);
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, outer);
  gradient.addColorStop(0, color);
  gradient.addColorStop(Math.max(0.2, 1 - softness), color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.globalAlpha *= alpha;
  ctx.fill();
}

function drawLayer(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  layer: SceneLayer,
  layerIndex: number,
  t: number,
  width: number,
  height: number,
): void {
  const { palette } = scene;
  const minSide = Math.min(width, height);
  const colors = [palette.primary, palette.secondary, palette.accent];
  const color = colors[layerIndex % colors.length] as string;
  const baseRotation = (layer.spec.rotation * Math.PI) / 180;

  for (const element of layer.elements) {
    const motion = motionAt(layer.spec, element, t);
    const cx = (element.x + motion.offsetX) * width;
    const cy = (element.y + motion.offsetY) * height;
    const size = element.size * minSide * 0.5 * motion.scale;
    const alpha = layer.spec.opacity * motion.alpha;
    const angle = baseRotation + motion.angle;

    ctx.save();
    switch (layer.spec.type) {
      case "blob": {
        blobPath(ctx, cx, cy, size, element, angle);
        ctx.save();
        ctx.clip();
        fillSoft(ctx, cx, cy, size, color, alpha, layer.spec.softness * 0.5);
        ctx.restore();
        if (layer.spec.softness > 0.4) {
          fillSoft(ctx, cx, cy, size * 1.05, color, alpha * 0.35, layer.spec.softness);
        }
        break;
      }
      case "ring": {
        const ringWidth = Math.max(2, size * 0.14);
        const passes = 1 + Math.round(layer.spec.softness * 2);
        for (let pass = 0; pass < passes; pass += 1) {
          ctx.beginPath();
          ctx.arc(cx, cy, size * (1 + pass * 0.045), 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = (alpha / (pass + 1)) * 0.9;
          ctx.lineWidth = ringWidth / (pass + 0.8);
          ctx.stroke();
        }
        break;
      }
      case "line": {
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const lineLength = size * 2.4;
        ctx.beginPath();
        ctx.moveTo(-lineLength / 2, 0);
        ctx.quadraticCurveTo(0, size * 0.18, lineLength / 2, 0);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(1.5, size * 0.05 * (1 + layer.spec.softness));
        ctx.lineCap = "round";
        ctx.stroke();
        break;
      }
      case "particles": {
        const particleSize = Math.max(1.5, size * 0.12);
        fillSoftDot(ctx, cx, cy, particleSize, color, alpha, layer.spec.softness);
        break;
      }
      case "petal": {
        ctx.translate(cx, cy);
        ctx.rotate(angle + element.phase);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.4, size * 0.32, size * 0.72, 0, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * (1 - layer.spec.softness * 0.25);
        ctx.fill();
        break;
      }
      case "ribbon": {
        ctx.translate(cx, cy);
        ctx.rotate(angle * 0.4);
        const ribbonLength = width * 0.8;
        const wave = size * 0.5;
        ctx.beginPath();
        ctx.moveTo(-ribbonLength / 2, 0);
        ctx.bezierCurveTo(
          -ribbonLength / 6,
          -wave,
          ribbonLength / 6,
          wave,
          ribbonLength / 2,
          0,
        );
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(3, size * 0.22);
        ctx.lineCap = "round";
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}

function fillSoftDot(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  alpha: number,
  softness: number,
): void {
  const outer = radius * (1.4 + softness * 1.4);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = alpha;
  ctx.fill();
}

/**
 * Zeichnet einen Frame. t läuft von 0 (Beginn) bis 1 (ruhiges Endbild).
 * Für Reduced Motion wird direkt t=1 gerendert.
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  t: number,
  width: number,
  height: number,
): void {
  const clampedT = Math.min(1, Math.max(0, t));
  ctx.clearRect(0, 0, width, height);
  ctx.globalAlpha = 1;
  drawBackground(ctx, scene, width, height);

  const fadeIn = smoothstep(0, 0.14, clampedT);
  scene.layers.forEach((layer, index) => {
    ctx.save();
    ctx.globalAlpha = fadeIn;
    drawLayer(ctx, scene, layer, index, clampedT, width, height);
    ctx.restore();
  });
}
