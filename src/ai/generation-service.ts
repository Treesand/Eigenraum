import type { EveningCheckout } from "../domain/evening-checkout";
import type { LocalDateKey } from "../domain/date-key";
import { addLocalDays } from "../domain/date-key";
import type { MorningArtifact } from "../domain/morning-artifact";
import { createId } from "../domain/id";
import { createFallbackArtifact } from "../animation/fallback-spec";
import {
  getArtifactByDate,
  listArtifactsBefore,
  upsertArtifactForDate,
} from "../storage/artifact-repository";
import { getEveningCheckoutByDate } from "../storage/evening-repository";
import type { AiProvider } from "./AiProvider";
import type { RecentContextEntry } from "./prompt-builder";
import { MORNING_ARTIFACT_PROMPT_VERSION } from "./prompt-version";
import { toAiError } from "./errors";
import type { EigenraumSettings } from "../storage/settings-repository";

export interface GenerationOutcome {
  artifact: MorningArtifact;
  usedFallback: boolean;
  errorCode: string | null;
}

/**
 * Kontext für das Modell: höchstens die letzten drei Abendzustände
 * samt gewählter Zielqualität – gemäß contextDepth-Einstellung.
 */
async function buildRecentContext(
  targetDate: LocalDateKey,
  contextDepth: 0 | 1 | 3,
): Promise<RecentContextEntry[]> {
  if (contextDepth === 0) {
    return [];
  }
  const artifacts = await listArtifactsBefore(targetDate, contextDepth);
  const entries: RecentContextEntry[] = [];
  for (const artifact of artifacts) {
    if (!artifact.sourceCheckoutId) {
      continue;
    }
    const checkoutDate = addLocalDays(artifact.targetDate, -1);
    const checkout = await getEveningCheckoutByDate(checkoutDate);
    if (checkout) {
      entries.push({
        state: checkout.state,
        targetQuality: artifact.interpretation.targetQuality,
      });
    }
  }
  return entries.slice(0, contextDepth);
}

function pendingArtifact(checkout: EveningCheckout, targetDate: LocalDateKey): MorningArtifact {
  const now = new Date().toISOString();
  return {
    id: createId(),
    targetDate,
    sourceCheckoutId: checkout.id,
    status: "pending",
    phrase: "",
    interpretation: {
      sourceCondition: "mixed",
      targetQuality: "continuity",
      shortRationale: "",
    },
    animation: createFallbackArtifact(checkout, targetDate).animation,
    model: null,
    promptVersion: MORNING_ARTIFACT_PROMPT_VERSION,
    schemaVersion: 1,
    generationErrorCode: null,
    generatedAt: now,
    createdAt: now,
  };
}

/**
 * Ablauf nach dem Speichern eines Abend-Checkouts:
 * pending-Artefakt anlegen → KI-Generierung → validiertes Artefakt
 * speichern; bei jedem Fehler entsteht stattdessen das lokale
 * Fallback-Artefakt. Der Checkout selbst ist zu diesem Zeitpunkt
 * bereits transaktional gespeichert und geht nie verloren.
 */
export async function generateMorningArtifact(
  checkout: EveningCheckout,
  provider: AiProvider,
  settings: EigenraumSettings,
): Promise<GenerationOutcome> {
  const targetDate = addLocalDays(checkout.date, 1);

  const existing = await getArtifactByDate(targetDate);
  const pending = existing
    ? { ...existing, status: "pending" as const, sourceCheckoutId: checkout.id }
    : pendingArtifact(checkout, targetDate);
  await upsertArtifactForDate(pending);

  try {
    const recentContext = await buildRecentContext(targetDate, settings.contextDepth);
    const output = await provider.generateArtifact({
      checkout,
      recentContext,
      model: settings.aiModel,
      reasoningEffort: settings.reasoningEffort,
    });

    const now = new Date().toISOString();
    const artifact: MorningArtifact = {
      id: pending.id,
      targetDate,
      sourceCheckoutId: checkout.id,
      status: "generated",
      phrase: output.phrase,
      interpretation: output.interpretation,
      animation: output.animation,
      model: settings.aiModel,
      promptVersion: MORNING_ARTIFACT_PROMPT_VERSION,
      schemaVersion: 1,
      generationErrorCode: null,
      generatedAt: now,
      createdAt: pending.createdAt,
    };
    const stored = await upsertArtifactForDate(artifact);
    return { artifact: stored, usedFallback: false, errorCode: null };
  } catch (error) {
    const aiError = toAiError(error);
    const fallback: MorningArtifact = {
      ...createFallbackArtifact(checkout, targetDate),
      id: pending.id,
      createdAt: pending.createdAt,
      generationErrorCode: aiError.code,
    };
    const stored = await upsertArtifactForDate(fallback);
    return { artifact: stored, usedFallback: true, errorCode: aiError.code };
  }
}
