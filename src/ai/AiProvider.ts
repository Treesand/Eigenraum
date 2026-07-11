import type { EveningCheckout } from "../domain/evening-checkout";
import type { GeneratedArtifactOutput } from "./output-schema";
import type { ReasoningEffort, RecentContextEntry } from "./prompt-builder";

export interface GenerationRequest {
  checkout: EveningCheckout;
  recentContext: RecentContextEntry[];
  model: string;
  reasoningEffort: ReasoningEffort;
}

/**
 * Abstraktion über die KI-Anbindung. Implementierungen:
 * - NativeAiProvider: echter OpenAI-Zugriff über das native Plugin
 * - MockAiProvider: deterministischer Mock für Browser/Tests
 * - UnavailableAiProvider: Web-Produktionsbuild ohne Mock
 */
export interface AiProvider {
  readonly kind: "native" | "mock" | "unavailable";

  isConfigured(): Promise<boolean>;
  configureKey(): Promise<{ saved: boolean; validated: boolean }>;
  deleteKey(): Promise<void>;
  testConnection(): Promise<{ valid: boolean; modelAccess: boolean }>;

  generateArtifact(request: GenerationRequest): Promise<GeneratedArtifactOutput>;
}
