import type { EveningCheckout, EveningState } from "../domain/evening-checkout";
import type { LocalDateKey } from "../domain/date-key";
import type {
  AnimationSpec,
  BackgroundStyle,
  MotionType,
  ShapeType,
} from "../domain/animation-spec";
import type {
  MorningArtifact,
  SourceCondition,
  TargetQuality,
} from "../domain/morning-artifact";
import { hashStringToSeed, mulberry32, randomBetween } from "./seeded-random";
import { normalizeAnimationSpec } from "./normalize-spec";
import { MORNING_ARTIFACT_PROMPT_VERSION } from "../ai/prompt-version";
import { createId } from "../domain/id";

interface FallbackEntry {
  sourceCondition: SourceCondition;
  targetQuality: TargetQuality;
  phrase: string;
  motion: MotionType;
}

export const fallbackMap: Record<EveningState, FallbackEntry> = {
  ueberfordert: {
    sourceCondition: "overload",
    targetQuality: "grounding",
    phrase: "Nicht alles braucht heute deinen Zugriff.",
    motion: "gather",
  },

  fremdbestimmt: {
    sourceCondition: "self_abandonment",
    targetQuality: "boundary",
    phrase: "Dein eigener Raum darf eine Grenze haben.",
    motion: "settle",
  },

  eingeengt: {
    sourceCondition: "constriction",
    targetQuality: "spaciousness",
    phrase: "Weite beginnt nicht erst außerhalb von dir.",
    motion: "unfold",
  },

  unruhig: {
    sourceCondition: "restlessness",
    targetQuality: "softness",
    phrase: "Ruhe ist keine Verhandlungsmasse.",
    motion: "breathe",
  },

  erschoepft: {
    sourceCondition: "flatness",
    targetQuality: "warmth",
    phrase: "Erschöpfung muss heute nichts beweisen.",
    motion: "settle",
  },

  leer: {
    sourceCondition: "flatness",
    targetQuality: "gentle_activation",
    phrase: "Leere muss nicht sofort gefüllt werden.",
    motion: "drift_up",
  },

  verbunden: {
    sourceCondition: "connected",
    targetQuality: "continuity",
    phrase: "Etwas von gestern darf bei dir bleiben.",
    motion: "breathe",
  },

  ruhig: {
    sourceCondition: "settled",
    targetQuality: "continuity",
    phrase: "Ruhe darf ihren eigenen Raum behalten.",
    motion: "open_space",
  },

  klar: {
    sourceCondition: "settled",
    targetQuality: "clarity",
    phrase: "Klarheit braucht heute keine Rechtfertigung.",
    motion: "settle",
  },

  zerstreut: {
    sourceCondition: "scattered",
    targetQuality: "grounding",
    phrase: "Du musst nicht jedem inneren Zug folgen.",
    motion: "gather",
  },

  gemischt: {
    sourceCondition: "mixed",
    targetQuality: "softness",
    phrase: "Mehrere Wahrheiten dürfen gleichzeitig da sein.",
    motion: "breathe",
  },
};

/**
 * Gestaltparameter je Zielqualität – die sanfte Gegenbewegung:
 * Überforderung → wenige Elemente und Sammlung, Enge → Öffnung,
 * Erschöpfung → Wärme ohne Aktivierung usw.
 */
const qualityDesign: Record<
  TargetQuality,
  {
    backgroundStyle: BackgroundStyle;
    hueRange: [number, number];
    warmth: number;
    negativeSpace: number;
    shapes: ShapeType[];
    maxCount: number;
    speed: number;
  }
> = {
  grounding: {
    backgroundStyle: "quiet_field",
    hueRange: [80, 150],
    warmth: 0.1,
    negativeSpace: 0.7,
    shapes: ["blob", "line"],
    maxCount: 3,
    speed: 0.2,
  },
  boundary: {
    backgroundStyle: "paper_light",
    hueRange: [150, 210],
    warmth: 0,
    negativeSpace: 0.6,
    shapes: ["ring", "blob"],
    maxCount: 2,
    speed: 0.18,
  },
  spaciousness: {
    backgroundStyle: "wide_gradient",
    hueRange: [180, 230],
    warmth: -0.2,
    negativeSpace: 0.85,
    shapes: ["line", "blob"],
    maxCount: 2,
    speed: 0.22,
  },
  clarity: {
    backgroundStyle: "paper_light",
    hueRange: [190, 220],
    warmth: -0.1,
    negativeSpace: 0.75,
    shapes: ["line", "ring"],
    maxCount: 3,
    speed: 0.2,
  },
  softness: {
    backgroundStyle: "morning_mist",
    hueRange: [250, 320],
    warmth: 0.15,
    negativeSpace: 0.65,
    shapes: ["blob"],
    maxCount: 3,
    speed: 0.12,
  },
  warmth: {
    backgroundStyle: "soft_halo",
    hueRange: [20, 50],
    warmth: 0.7,
    negativeSpace: 0.65,
    shapes: ["blob", "ring"],
    maxCount: 2,
    speed: 0.1,
  },
  gentle_activation: {
    backgroundStyle: "morning_mist",
    hueRange: [40, 70],
    warmth: 0.35,
    negativeSpace: 0.7,
    shapes: ["particles", "blob"],
    maxCount: 8,
    speed: 0.25,
  },
  continuity: {
    backgroundStyle: "soft_halo",
    hueRange: [30, 90],
    warmth: 0.3,
    negativeSpace: 0.7,
    shapes: ["ring", "blob"],
    maxCount: 2,
    speed: 0.15,
  },
};

export function buildFallbackAnimationSpec(
  state: EveningState,
  seed: number,
): AnimationSpec {
  const entry = fallbackMap[state];
  const design = qualityDesign[entry.targetQuality];
  const random = mulberry32(seed);

  const layerTotal = Math.min(2, design.shapes.length);
  const layers = design.shapes.slice(0, layerTotal).map((shape, index) => ({
    type: shape,
    motion: entry.motion,
    direction:
      entry.motion === "gather"
        ? ("center" as const)
        : entry.motion === "unfold" || entry.motion === "open_space"
          ? ("outward" as const)
          : entry.motion === "drift_up"
            ? ("upward" as const)
            : ("none" as const),
    count:
      shape === "particles"
        ? design.maxCount
        : Math.max(1, Math.round(randomBetween(random, 1, design.maxCount))),
    size: randomBetween(random, 0.22, 0.45) * (index === 0 ? 1.25 : 0.8),
    opacity: randomBetween(random, 0.2, 0.42),
    speed: design.speed,
    softness: randomBetween(random, 0.55, 0.9),
    rotation: randomBetween(random, -25, 25),
  }));

  return normalizeAnimationSpec({
    version: 1,
    seed,
    durationMs: Math.round(randomBetween(random, 3_600, 4_600)),
    backgroundStyle: design.backgroundStyle,
    baseHue: Math.round(randomBetween(random, design.hueRange[0], design.hueRange[1])),
    secondaryHueOffset: randomBetween(random, -35, 35),
    saturation: randomBetween(random, 0.2, 0.4),
    lightness: randomBetween(random, 0.72, 0.88),
    contrast: randomBetween(random, 0.12, 0.3),
    warmth: design.warmth,
    centerBias: entry.motion === "gather" ? 0.85 : randomBetween(random, 0.35, 0.7),
    negativeSpace: design.negativeSpace,
    symmetry: randomBetween(random, 0.3, 0.8),
    layers,
  });
}

/**
 * Vollständig lokaler, deterministischer Fallback-Generator.
 * Seed = stabiler Hash aus checkout.id + targetDate.
 */
export function createFallbackArtifact(
  checkout: EveningCheckout,
  targetDate: LocalDateKey,
): MorningArtifact {
  const entry = fallbackMap[checkout.state];
  const seed = hashStringToSeed(checkout.id + targetDate);
  const now = new Date().toISOString();

  return {
    id: createId(),
    targetDate,
    sourceCheckoutId: checkout.id,
    status: "fallback",
    phrase: entry.phrase,
    interpretation: {
      sourceCondition: entry.sourceCondition,
      targetQuality: entry.targetQuality,
      shortRationale:
        "Lokal gestaltet: sanfte Gegenbewegung zum Abendzustand ohne KI-Beteiligung.",
    },
    animation: buildFallbackAnimationSpec(checkout.state, seed),
    model: null,
    promptVersion: MORNING_ARTIFACT_PROMPT_VERSION,
    schemaVersion: 1,
    generationErrorCode: null,
    generatedAt: now,
    createdAt: now,
  };
}

export const NEUTRAL_MORNING_PHRASE = "Du musst dich heute nicht sofort erklären.";

/**
 * Neutrales Artefakt für Morgen ohne vorherigen Checkout –
 * es darf nie ein leerer Bildschirm entstehen.
 */
export function createNeutralArtifact(targetDate: LocalDateKey): MorningArtifact {
  const seed = hashStringToSeed(`neutral:${targetDate}`);
  const now = new Date().toISOString();
  return {
    id: createId(),
    targetDate,
    sourceCheckoutId: "",
    status: "fallback",
    phrase: NEUTRAL_MORNING_PHRASE,
    interpretation: {
      sourceCondition: "settled",
      targetQuality: "continuity",
      shortRationale: "Neutrales Morgenartefakt ohne vorherigen Abend-Checkout.",
    },
    animation: buildFallbackAnimationSpec("ruhig", seed),
    model: null,
    promptVersion: MORNING_ARTIFACT_PROMPT_VERSION,
    schemaVersion: 1,
    generationErrorCode: null,
    generatedAt: now,
    createdAt: now,
  };
}
