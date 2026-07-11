import { registerPlugin } from "@capacitor/core";

/**
 * Schnittstelle des nativen Plugins. Bewusst OHNE getApiKey():
 * Der Key wird nativ eingegeben, nativ gespeichert und verlässt
 * die native Schicht nie in Richtung JavaScript.
 */
export interface NativeOpenAIPlugin {
  hasApiKey(): Promise<{
    configured: boolean;
  }>;

  promptForApiKey(): Promise<{
    saved: boolean;
    validated: boolean;
  }>;

  deleteApiKey(): Promise<void>;

  testConnection(): Promise<{
    valid: boolean;
    modelAccess: boolean;
  }>;

  createResponse(options: { body: string }): Promise<{
    status: number;
    body: string;
    requestId: string | null;
  }>;
}

/**
 * Web-Stub: Im Browser gibt es keinen echten OpenAI-Zugang.
 * Jede echte KI-Operation endet mit AI_UNAVAILABLE_ON_WEB.
 */
class NativeOpenAIWebStub implements NativeOpenAIPlugin {
  async hasApiKey(): Promise<{ configured: boolean }> {
    return { configured: false };
  }

  async promptForApiKey(): Promise<{ saved: boolean; validated: boolean }> {
    throw new Error("AI_UNAVAILABLE_ON_WEB");
  }

  async deleteApiKey(): Promise<void> {
    // Im Web existiert kein Key – nichts zu löschen.
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    throw new Error("AI_UNAVAILABLE_ON_WEB");
  }

  async createResponse(): Promise<{ status: number; body: string; requestId: string | null }> {
    throw new Error("AI_UNAVAILABLE_ON_WEB");
  }
}

export const NativeOpenAI = registerPlugin<NativeOpenAIPlugin>("NativeOpenAI", {
  web: () => new NativeOpenAIWebStub(),
});
