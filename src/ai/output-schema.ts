import { z } from "zod";
import {
  BACKGROUND_STYLES,
  MOTION_DIRECTIONS,
  MOTION_TYPES,
  SHAPE_TYPES,
} from "../domain/animation-spec";
import { SOURCE_CONDITIONS, TARGET_QUALITIES } from "../domain/morning-artifact";
import { SPEC_LIMITS } from "../animation/normalize-spec";

/**
 * Eine einzige Zod-Definition ist die Quelle für den TypeScript-Typ,
 * die lokale Laufzeitvalidierung und (über z.toJSONSchema) das an
 * OpenAI übermittelte Structured-Output-Schema.
 *
 * Numerische Bereichsgrenzen werden lokal bewusst NICHT hart validiert –
 * ungültige Zahlen werden nach der Validierung geklemmt (normalize-spec).
 * In das übermittelte JSON-Schema werden die Grenzen aus SPEC_LIMITS
 * als minimum/maximum injiziert, damit beide aus derselben Quelle stammen.
 */

export const AnimationLayerSchema = z.strictObject({
  type: z.enum(SHAPE_TYPES),
  motion: z.enum(MOTION_TYPES),
  direction: z.enum(MOTION_DIRECTIONS),
  count: z.number(),
  size: z.number(),
  opacity: z.number(),
  speed: z.number(),
  softness: z.number(),
  rotation: z.number(),
});

export const AnimationSpecSchema = z.strictObject({
  version: z.literal(1),
  seed: z.number(),
  durationMs: z.number(),
  backgroundStyle: z.enum(BACKGROUND_STYLES),
  baseHue: z.number(),
  secondaryHueOffset: z.number(),
  saturation: z.number(),
  lightness: z.number(),
  contrast: z.number(),
  warmth: z.number(),
  centerBias: z.number(),
  negativeSpace: z.number(),
  symmetry: z.number(),
  layers: z.array(AnimationLayerSchema).min(1).max(SPEC_LIMITS.layerCount.max),
});

export const ArtifactInterpretationSchema = z.strictObject({
  sourceCondition: z.enum(SOURCE_CONDITIONS),
  targetQuality: z.enum(TARGET_QUALITIES),
  shortRationale: z.string(),
});

export const GeneratedArtifactOutputSchema = z.strictObject({
  phrase: z.string().min(1),
  interpretation: ArtifactInterpretationSchema,
  animation: AnimationSpecSchema,
});

export type GeneratedArtifactOutput = z.infer<typeof GeneratedArtifactOutputSchema>;

export const OPENAI_OUTPUT_SCHEMA_NAME = "eigenraum_morning_artifact_v1";

type JsonSchemaNode = {
  [key: string]: unknown;
  type?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  const?: unknown;
};

const numericConstraints: Record<string, { minimum: number; maximum: number }> = {
  seed: { minimum: SPEC_LIMITS.seed.min, maximum: SPEC_LIMITS.seed.max },
  durationMs: { minimum: SPEC_LIMITS.durationMs.min, maximum: SPEC_LIMITS.durationMs.max },
  baseHue: { minimum: SPEC_LIMITS.baseHue.min, maximum: SPEC_LIMITS.baseHue.max },
  secondaryHueOffset: {
    minimum: SPEC_LIMITS.secondaryHueOffset.min,
    maximum: SPEC_LIMITS.secondaryHueOffset.max,
  },
  saturation: { minimum: SPEC_LIMITS.saturation.min, maximum: SPEC_LIMITS.saturation.max },
  lightness: { minimum: SPEC_LIMITS.lightness.min, maximum: SPEC_LIMITS.lightness.max },
  contrast: { minimum: SPEC_LIMITS.contrast.min, maximum: SPEC_LIMITS.contrast.max },
  warmth: { minimum: SPEC_LIMITS.warmth.min, maximum: SPEC_LIMITS.warmth.max },
  centerBias: { minimum: SPEC_LIMITS.centerBias.min, maximum: SPEC_LIMITS.centerBias.max },
  negativeSpace: {
    minimum: SPEC_LIMITS.negativeSpace.min,
    maximum: SPEC_LIMITS.negativeSpace.max,
  },
  symmetry: { minimum: SPEC_LIMITS.symmetry.min, maximum: SPEC_LIMITS.symmetry.max },
  count: { minimum: SPEC_LIMITS.count.min, maximum: SPEC_LIMITS.count.max },
  size: { minimum: SPEC_LIMITS.size.min, maximum: SPEC_LIMITS.size.max },
  opacity: { minimum: SPEC_LIMITS.opacity.min, maximum: SPEC_LIMITS.opacity.max },
  speed: { minimum: SPEC_LIMITS.speed.min, maximum: SPEC_LIMITS.speed.max },
  softness: { minimum: SPEC_LIMITS.softness.min, maximum: SPEC_LIMITS.softness.max },
  rotation: { minimum: SPEC_LIMITS.rotation.min, maximum: SPEC_LIMITS.rotation.max },
};

const integerFields = new Set(["seed", "durationMs", "count", "baseHue"]);

function sanitizeForOpenAi(node: JsonSchemaNode, name?: string): void {
  delete node.$schema;
  delete node.default;

  // "const" durch ein enum ersetzen – von Structured Outputs breiter unterstützt.
  if ("const" in node) {
    node.enum = [node.const];
    delete node.const;
    if (typeof node.enum[0] === "number") {
      node.type = Number.isInteger(node.enum[0]) ? "integer" : "number";
    }
  }

  if (node.type === "object" && node.properties) {
    node.additionalProperties = false;
    node.required = Object.keys(node.properties);
    for (const [childName, child] of Object.entries(node.properties)) {
      sanitizeForOpenAi(child, childName);
    }
  }

  if (node.items) {
    sanitizeForOpenAi(node.items, name);
  }

  if (node.type === "number" || node.type === "integer") {
    if (name && numericConstraints[name]) {
      node.minimum = numericConstraints[name].minimum;
      node.maximum = numericConstraints[name].maximum;
    }
    if (name && integerFields.has(name)) {
      node.type = "integer";
    }
  }

  if (node.type === "string" && name === "phrase") {
    node.maxLength = 90;
  }
  if (node.type === "string" && name === "shortRationale") {
    node.maxLength = 240;
  }
}

/**
 * Erzeugt das an die Responses API übermittelte JSON-Schema
 * (strict mode: alle Felder erforderlich, additionalProperties: false).
 */
export function buildOpenAiOutputJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(GeneratedArtifactOutputSchema) as JsonSchemaNode;
  sanitizeForOpenAi(schema);
  return schema;
}
