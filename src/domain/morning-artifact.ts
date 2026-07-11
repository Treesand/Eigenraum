import type { LocalDateKey } from "./date-key";
import type { AnimationSpec } from "./animation-spec";

export const ARTIFACT_STATUSES = ["pending", "generated", "fallback", "failed"] as const;

export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];

export const SOURCE_CONDITIONS = [
  "overload",
  "scattered",
  "self_abandonment",
  "constriction",
  "restlessness",
  "flatness",
  "disconnection",
  "settled",
  "connected",
  "mixed",
] as const;

export type SourceCondition = (typeof SOURCE_CONDITIONS)[number];

export const TARGET_QUALITIES = [
  "grounding",
  "boundary",
  "spaciousness",
  "clarity",
  "softness",
  "warmth",
  "gentle_activation",
  "continuity",
] as const;

export type TargetQuality = (typeof TARGET_QUALITIES)[number];

export interface ArtifactInterpretation {
  sourceCondition: SourceCondition;
  targetQuality: TargetQuality;
  shortRationale: string;
}

export interface MorningArtifact {
  id: string;
  targetDate: LocalDateKey;
  sourceCheckoutId: string;

  status: ArtifactStatus;
  phrase: string;
  interpretation: ArtifactInterpretation;
  animation: AnimationSpec;

  model: string | null;
  promptVersion: string;
  schemaVersion: 1;

  generationErrorCode: string | null;
  generatedAt: string;
  createdAt: string;
}

export const PHRASE_MAX_LENGTH = 90;

/**
 * Trimmt die Phrase und begrenzt sie auf 90 Zeichen –
 * bei Kürzung möglichst an einer Wortgrenze, mit Auslassungszeichen.
 */
export function clampPhrase(phrase: string): string {
  const trimmed = phrase.trim().replace(/\s+/g, " ");
  if (trimmed.length <= PHRASE_MAX_LENGTH) {
    return trimmed;
  }
  const slice = trimmed.slice(0, PHRASE_MAX_LENGTH - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > 40 ? slice.slice(0, lastSpace) : slice;
  return `${base.replace(/[\s,.;:–-]+$/, "")}…`;
}
