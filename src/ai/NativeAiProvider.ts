import type { AiProvider, GenerationRequest } from "./AiProvider";
import type { GeneratedArtifactOutput } from "./output-schema";
import { NativeOpenAI } from "../native/NativeOpenAI";
import { buildGenerationInput, buildResponsesRequestBody } from "./prompt-builder";
import { parseResponsesHttpResult } from "./response-parser";
import { AiError, toAiError } from "./errors";

/**
 * Verbindet die Generierung mit dem nativen Plugin.
 * Hier entsteht nur der Request-Body – Host, Pfad und
 * Authorization-Header liegen ausschließlich im nativen Code.
 */
export class NativeAiProvider implements AiProvider {
  readonly kind = "native" as const;

  async isConfigured(): Promise<boolean> {
    const { configured } = await NativeOpenAI.hasApiKey();
    return configured;
  }

  async configureKey(): Promise<{ saved: boolean; validated: boolean }> {
    try {
      return await NativeOpenAI.promptForApiKey();
    } catch (error) {
      throw toAiError(error);
    }
  }

  async deleteKey(): Promise<void> {
    await NativeOpenAI.deleteApiKey();
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    try {
      return await NativeOpenAI.testConnection();
    } catch (error) {
      throw toAiError(error);
    }
  }

  async generateArtifact(request: GenerationRequest): Promise<GeneratedArtifactOutput> {
    const configured = await this.isConfigured();
    if (!configured) {
      throw new AiError("API_KEY_MISSING");
    }

    const input = buildGenerationInput(request.checkout, request.recentContext);
    const body = buildResponsesRequestBody(input, request.model, request.reasoningEffort);

    let status: number;
    let responseBody: string;
    try {
      const result = await NativeOpenAI.createResponse({ body });
      status = result.status;
      responseBody = result.body;
    } catch (error) {
      throw toAiError(error);
    }

    return parseResponsesHttpResult(status, responseBody);
  }
}
