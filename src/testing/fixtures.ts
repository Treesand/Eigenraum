import type { EveningCheckout, EveningState } from "../domain/evening-checkout";
import type { AnimationSpec } from "../domain/animation-spec";
import type { GeneratedArtifactOutput } from "../ai/output-schema";

export function makeCheckout(overrides: Partial<EveningCheckout> = {}): EveningCheckout {
  return {
    id: "checkout-test-1",
    date: "2026-07-11",
    momentWithSelf: "Beim Schreiben am Nachmittag.",
    momentOfLeavingSelf: "Als ich sofort wieder zugesagt habe.",
    whatHelped: "Ruhe und Sortieren.",
    whatWasMissing: "Freier Raum.",
    state: "fremdbestimmt" as EveningState,
    intensity: 4,
    createdAt: "2026-07-11T20:30:00.000Z",
    updatedAt: "2026-07-11T20:30:00.000Z",
    ...overrides,
  };
}

export function makeAnimationSpec(overrides: Partial<AnimationSpec> = {}): AnimationSpec {
  return {
    version: 1,
    seed: 1234567,
    durationMs: 4000,
    backgroundStyle: "quiet_field",
    baseHue: 120,
    secondaryHueOffset: 30,
    saturation: 0.3,
    lightness: 0.8,
    contrast: 0.2,
    warmth: 0.2,
    centerBias: 0.6,
    negativeSpace: 0.7,
    symmetry: 0.5,
    layers: [
      {
        type: "blob",
        motion: "gather",
        direction: "center",
        count: 3,
        size: 0.3,
        opacity: 0.4,
        speed: 0.2,
        softness: 0.7,
        rotation: 10,
      },
    ],
    ...overrides,
  };
}

export function makeGeneratedOutput(
  overrides: Partial<GeneratedArtifactOutput> = {},
): GeneratedArtifactOutput {
  return {
    phrase: "Dein eigener Raum darf eine Grenze haben.",
    interpretation: {
      sourceCondition: "self_abandonment",
      targetQuality: "boundary",
      shortRationale: "Fremdbestimmung wird mit einer weichen Begrenzung beantwortet.",
    },
    animation: makeAnimationSpec(),
    ...overrides,
  };
}

/**
 * Baut eine gültige Responses-API-Antwort um einen Output-Text herum.
 */
export function makeResponsesApiBody(outputText: string): string {
  return JSON.stringify({
    id: "resp_test",
    status: "completed",
    output: [
      {
        type: "reasoning",
        summary: [],
      },
      {
        type: "message",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: outputText,
          },
        ],
      },
    ],
  });
}
