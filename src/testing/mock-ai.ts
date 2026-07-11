import type { AiProvider, GenerationRequest } from "../ai/AiProvider";
import type { GeneratedArtifactOutput } from "../ai/output-schema";
import { AiError, type AiErrorCode } from "../ai/errors";
import { makeGeneratedOutput } from "./fixtures";

/**
 * Feinsteuerbarer Test-Provider für Unit- und Komponententests
 * (der MockAiProvider aus src/ai ist für Browser/E2E gedacht).
 */
export class TestAiProvider implements AiProvider {
  readonly kind = "mock" as const;

  configured = true;
  failWith: AiErrorCode | null = null;
  output: GeneratedArtifactOutput = makeGeneratedOutput();
  calls: GenerationRequest[] = [];

  async isConfigured(): Promise<boolean> {
    return this.configured;
  }

  async configureKey(): Promise<{ saved: boolean; validated: boolean }> {
    this.configured = true;
    return { saved: true, validated: true };
  }

  async deleteKey(): Promise<void> {
    this.configured = false;
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    return { valid: this.configured, modelAccess: this.configured };
  }

  async generateArtifact(request: GenerationRequest): Promise<GeneratedArtifactOutput> {
    this.calls.push(request);
    if (this.failWith) {
      throw new AiError(this.failWith);
    }
    return this.output;
  }
}
