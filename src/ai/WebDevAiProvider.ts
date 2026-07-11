import type { AiProvider, GenerationRequest } from "./AiProvider";
import type { GeneratedArtifactOutput } from "./output-schema";
import {
  buildGenerationInput,
  buildResponsesRequestBody,
  DEFAULT_AI_MODEL,
} from "./prompt-builder";
import { parseResponsesHttpResult } from "./response-parser";
import { AiError } from "./errors";

const DEV_KEY_STORAGE = "eigenraum.devAi.key";

/**
 * Pfad des Vite-Dev-Proxys (vite.config.ts), der an https://api.openai.com
 * weiterleitet. Same-Origin, damit CSP (connect-src 'self') und CORS
 * im Dev-Server kein Thema sind.
 */
const DEV_ENDPOINT = "/openai-dev-proxy/v1/responses";

const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Echter OpenAI-Zugriff im Browser – NUR für die Entwicklung.
 * Der Key liegt hier bewusst im localStorage; das ist der Kompromiss,
 * den der native Pfad (Keychain/Keystore) für die Produktion vermeidet.
 * Wird nur aktiv, wenn der Dev-Schalter in den Einstellungen gesetzt ist.
 */
export class WebDevAiProvider implements AiProvider {
  readonly kind = "web-dev" as const;

  private readKey(): string | null {
    try {
      return localStorage.getItem(DEV_KEY_STORAGE);
    } catch {
      return null;
    }
  }

  async isConfigured(): Promise<boolean> {
    const key = this.readKey();
    return key !== null && key.trim() !== "";
  }

  async configureKey(): Promise<{ saved: boolean; validated: boolean }> {
    const entered = window.prompt(
      "OpenAI API-Key (nur Browser-Entwicklung – wird unverschlüsselt im localStorage abgelegt):",
    );
    if (entered === null || entered.trim() === "") {
      return { saved: false, validated: false };
    }
    localStorage.setItem(DEV_KEY_STORAGE, entered.trim());
    try {
      const result = await this.testConnection();
      return { saved: true, validated: result.valid };
    } catch {
      return { saved: true, validated: false };
    }
  }

  async deleteKey(): Promise<void> {
    localStorage.removeItem(DEV_KEY_STORAGE);
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    // Gleiche Probe wie der native Client: minimaler Responses-Call.
    const probeBody = JSON.stringify({
      model: DEFAULT_AI_MODEL,
      input: "ping",
      store: false,
      max_output_tokens: 16,
    });
    const { status } = await this.post(probeBody);
    return { valid: status !== 401 && status !== 403, modelAccess: status === 200 };
  }

  async generateArtifact(request: GenerationRequest): Promise<GeneratedArtifactOutput> {
    const input = buildGenerationInput(request.checkout, request.recentContext);
    const body = buildResponsesRequestBody(input, request.model, request.reasoningEffort);
    const { status, text } = await this.post(body);
    return parseResponsesHttpResult(status, text);
  }

  private async post(body: string): Promise<{ status: number; text: string }> {
    const key = this.readKey();
    if (!key || key.trim() === "") {
      throw new AiError("API_KEY_MISSING");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(DEV_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });
      return { status: response.status, text: await response.text() };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AiError("NETWORK_TIMEOUT");
      }
      throw new AiError("NETWORK_OFFLINE");
    } finally {
      clearTimeout(timer);
    }
  }
}
