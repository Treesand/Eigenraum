import type { EveningCheckout, EveningState } from "../domain/evening-checkout";
import type { TargetQuality } from "../domain/morning-artifact";
import { buildOpenAiOutputJsonSchema, OPENAI_OUTPUT_SCHEMA_NAME } from "./output-schema";

export const DEFAULT_AI_MODEL = "gpt-5.6-terra";

/** In den Einstellungen wählbare Modelle. */
export const AI_MODELS = [
  { id: "gpt-5.6-terra", label: "Terra", description: "Ausgewogen (Standard)" },
  { id: "gpt-5.6-sol", label: "Sol", description: "Leistungsstärker, teurer" },
  { id: "gpt-5.6-luna", label: "Luna", description: "Schneller, günstiger" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export const REASONING_EFFORTS = [
  { id: "minimal", label: "Aus", description: "Kein zusätzliches Nachdenken" },
  { id: "low", label: "Kurz", description: "Kurzes Nachdenken (Standard)" },
  { id: "medium", label: "Mittel", description: "Gründlicheres Nachdenken" },
  { id: "high", label: "Ausführlich", description: "Ausführliches Nachdenken, langsamer" },
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]["id"];

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "low";

/**
 * Reasoning-Tokens zählen gegen max_output_tokens – höhere Thinking-Stufen
 * brauchen mehr Budget, damit die eigentliche Antwort nicht abbricht.
 */
const MAX_OUTPUT_TOKENS_BY_EFFORT: Record<ReasoningEffort, number> = {
  minimal: 900,
  low: 900,
  medium: 2_500,
  high: 5_000,
};

export function isKnownAiModel(value: string): value is AiModelId {
  return AI_MODELS.some((model) => model.id === value);
}

export function isKnownReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.some((effort) => effort.id === value);
}

export const SYSTEM_INSTRUCTIONS = `Du gestaltest für die persönliche Anwendung „Eigenraum“ ein abstraktes
Morgenartefakt auf Basis eines kurzen abendlichen Selbst-Checkouts.

Deine Aufgabe ist nicht, den Zustand des Abends dekorativ zu spiegeln.
Erkenne stattdessen eine sanfte Gegenbewegung, die dem Nutzer am nächsten
Morgen etwas mehr Selbstnähe ermöglicht.

Beispiele der Gegenbewegung:
- Überforderung wird durch Sammlung und geringe visuelle Dichte beantwortet.
- Zerstreutheit wird durch eine ruhige Mitte beantwortet.
- Selbstverlassen oder Fremdbestimmung wird durch eine weiche, sichtbare
  Begrenzung beantwortet.
- Enge wird durch Öffnung und negativen Raum beantwortet.
- Unruhe wird durch langsame, gleichmäßige Bewegung beantwortet.
- Erschöpfung wird durch Wärme und geringe Aktivierung beantwortet.
- Leere wird durch einen kleinen Licht- oder Aufwärtsimpuls beantwortet.
- Verbundenheit und Ruhe sollen nicht korrigiert, sondern fortgeführt werden.

Formuliere einen einzigen kurzen deutschen Satz für den Morgen.

Der Satz:
- umfasst ungefähr 4 bis 11 Wörter,
- ist höchstens 90 Zeichen lang,
- enthält kein Ausrufezeichen,
- enthält keinen Befehl,
- ist keine Motivation,
- ist kein Lob,
- ist kein Ratschlag,
- behauptet keine Diagnose,
- klingt nicht therapeutisch,
- klingt nicht esoterisch,
- klingt nicht wie Werbung oder Social Media,
- darf eine Grenze, Erlaubnis, Würdigung oder ruhige Beobachtung ausdrücken.

Vermeide insbesondere:
„Du schaffst das“,
„Heute ist ein neuer Tag“,
„Sei die beste Version deiner selbst“,
„Alles wird gut“,
„Mindset“,
„Manifestieren“.

Erzeuge eine abstrakte Animation ausschließlich über das vorgegebene Schema.
Erzeuge keinen Code, kein SVG, kein HTML, kein CSS und keine Bildbeschreibung.

Die Animation soll:
- 3,2 bis 5 Sekunden dauern,
- aus höchstens vier Ebenen bestehen,
- organisch und erwachsen wirken,
- eine ruhige Gegenbewegung zum Abendzustand zeigen,
- ausreichend negative Fläche enthalten,
- morgens nicht überfordern.

Nutze keine Figuren, Menschen, Gesichter, Herzen, Häkchen, Trophäen,
Schriftzeichen oder gegenständlichen Symbole.

Die kurze Begründung beschreibt sachlich, welche Gegenbewegung gewählt wurde.
Sie wird nicht direkt auf dem Morgenbildschirm angezeigt.

Gib ausschließlich das Ergebnis im vorgegebenen JSON-Schema zurück.`;

export interface RecentContextEntry {
  state: EveningState;
  targetQuality: TargetQuality;
}

export interface GenerationInput {
  language: "de";
  currentCheckout: {
    momentWithSelf: string;
    momentOfLeavingSelf: string;
    whatHelped: string;
    whatWasMissing: string;
    state: EveningState;
    intensity: number;
  };
  recentContext: RecentContextEntry[];
}

/**
 * Baut den an das Modell gesendeten Kontext. Bewusst ohne IDs,
 * Namen, Geräteinformationen oder vollständige Historie –
 * höchstens die drei letzten Zustände samt Zielqualität.
 */
export function buildGenerationInput(
  checkout: EveningCheckout,
  recentContext: RecentContextEntry[],
): GenerationInput {
  return {
    language: "de",
    currentCheckout: {
      momentWithSelf: checkout.momentWithSelf.trim(),
      momentOfLeavingSelf: checkout.momentOfLeavingSelf.trim(),
      whatHelped: checkout.whatHelped.trim(),
      whatWasMissing: checkout.whatWasMissing.trim(),
      state: checkout.state,
      intensity: checkout.intensity,
    },
    recentContext: recentContext.slice(0, 3),
  };
}

/**
 * Erzeugt den vollständigen Request-Body für POST /v1/responses.
 * Der Authorization-Header entsteht ausschließlich im nativen Plugin –
 * hier gibt es keinen Key und keine URL.
 */
export function buildResponsesRequestBody(
  input: GenerationInput,
  model: string,
  reasoningEffort: ReasoningEffort = DEFAULT_REASONING_EFFORT,
): string {
  return JSON.stringify({
    model,
    store: false,
    instructions: SYSTEM_INSTRUCTIONS,
    input: JSON.stringify(input),
    reasoning: {
      effort: reasoningEffort,
    },
    max_output_tokens: MAX_OUTPUT_TOKENS_BY_EFFORT[reasoningEffort],
    text: {
      format: {
        type: "json_schema",
        name: OPENAI_OUTPUT_SCHEMA_NAME,
        strict: true,
        schema: buildOpenAiOutputJsonSchema(),
      },
    },
  });
}
