import type { AiProvider, GenerationRequest } from "./AiProvider";
import type { GeneratedArtifactOutput } from "./output-schema";
import { AiError, isAiErrorCode } from "./errors";
import { buildFallbackAnimationSpec, fallbackMap } from "../animation/fallback-spec";
import { hashStringToSeed } from "../animation/seeded-random";
import { clampPhrase } from "../domain/morning-artifact";

const MOCK_CONFIGURED_KEY = "eigenraum.mockAi.configured";
const MOCK_FAIL_KEY = "eigenraum.mockAi.failWith";

const mockPhrases: Record<string, string> = {
  ueberfordert: "Nicht jede Anfrage von gestern gehört zu dir.",
  zerstreut: "Eine ruhige Mitte reicht für den Anfang.",
  fremdbestimmt: "Dein Morgen gehört zuerst dir selbst.",
  eingeengt: "Etwas Raum darf heute ungenutzt bleiben.",
  unruhig: "Langsamkeit ist heute keine Schwäche.",
  erschoepft: "Wärme darf vor Leistung kommen.",
  leer: "Ein kleines Licht genügt für den Anfang.",
  verbunden: "Die Nähe von gestern trägt noch.",
  ruhig: "Die Ruhe darf einfach weitergehen.",
  klar: "Deine Klarheit braucht keinen Beweis.",
  gemischt: "Vieles darf nebeneinander wahr sein.",
};

declare global {
  interface Window {
    __eigenraumMockAiCalls?: number;
  }
}

/**
 * Deterministischer Mock-Provider für Browser-Entwicklung und Tests.
 * Konfigurierbar über localStorage:
 * - eigenraum.mockAi.configured: "true" | "false"
 * - eigenraum.mockAi.failWith: ein AiErrorCode, der geworfen werden soll
 */
export class MockAiProvider implements AiProvider {
  readonly kind = "mock" as const;

  async isConfigured(): Promise<boolean> {
    return localStorage.getItem(MOCK_CONFIGURED_KEY) === "true";
  }

  async configureKey(): Promise<{ saved: boolean; validated: boolean }> {
    localStorage.setItem(MOCK_CONFIGURED_KEY, "true");
    return { saved: true, validated: true };
  }

  async deleteKey(): Promise<void> {
    localStorage.removeItem(MOCK_CONFIGURED_KEY);
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    const configured = await this.isConfigured();
    return { valid: configured, modelAccess: configured };
  }

  async generateArtifact(request: GenerationRequest): Promise<GeneratedArtifactOutput> {
    if (typeof window !== "undefined") {
      window.__eigenraumMockAiCalls = (window.__eigenraumMockAiCalls ?? 0) + 1;
    }

    const failWith = localStorage.getItem(MOCK_FAIL_KEY);
    if (failWith && isAiErrorCode(failWith)) {
      throw new AiError(failWith);
    }

    if (!(await this.isConfigured())) {
      throw new AiError("API_KEY_MISSING");
    }

    const { checkout } = request;
    const entry = fallbackMap[checkout.state];
    const seed = hashStringToSeed(`mock:${checkout.id}:${checkout.date}`);

    return {
      phrase: clampPhrase(mockPhrases[checkout.state] ?? entry.phrase),
      interpretation: {
        sourceCondition: entry.sourceCondition,
        targetQuality: entry.targetQuality,
        shortRationale: `Mock: ${checkout.state} wird mit ${entry.targetQuality} beantwortet.`,
      },
      animation: buildFallbackAnimationSpec(checkout.state, seed),
    };
  }
}
