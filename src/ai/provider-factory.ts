import { Capacitor } from "@capacitor/core";
import type { AiProvider, GenerationRequest } from "./AiProvider";
import type { GeneratedArtifactOutput } from "./output-schema";
import { NativeAiProvider } from "./NativeAiProvider";
import { WebDevAiProvider } from "./WebDevAiProvider";
import { MockAiProvider } from "./MockAiProvider";
import { AiError } from "./errors";

/**
 * Web-Produktionsbuild ohne Mock: echte KI-Aufrufe sind im Browser
 * grundsätzlich nicht möglich (kein Key im WebView).
 */
class UnavailableAiProvider implements AiProvider {
  readonly kind = "unavailable" as const;

  async isConfigured(): Promise<boolean> {
    return false;
  }

  async configureKey(): Promise<{ saved: boolean; validated: boolean }> {
    throw new AiError("AI_UNAVAILABLE_ON_WEB");
  }

  async deleteKey(): Promise<void> {
    // kein Key vorhanden
  }

  async testConnection(): Promise<{ valid: boolean; modelAccess: boolean }> {
    throw new AiError("AI_UNAVAILABLE_ON_WEB");
  }

  async generateArtifact(_request: GenerationRequest): Promise<GeneratedArtifactOutput> {
    throw new AiError("AI_UNAVAILABLE_ON_WEB");
  }
}

const REAL_WEB_AI_STORAGE = "eigenraum.devAi.real";

/**
 * Dev-Schalter (Einstellungen): echte OpenAI-Anfragen im Browser über
 * den Vite-Proxy. Nur im Dev-Build wirksam, damit E2E-Tests und
 * Produktions-Web-Builds davon unberührt bleiben.
 */
export function isRealWebAiEnabled(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  try {
    return localStorage.getItem(REAL_WEB_AI_STORAGE) === "true";
  } catch {
    return false;
  }
}

export function setRealWebAiEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(REAL_WEB_AI_STORAGE, "true");
    } else {
      localStorage.removeItem(REAL_WEB_AI_STORAGE);
    }
  } catch {
    // localStorage nicht verfügbar – Schalter bleibt wirkungslos.
  }
}

function mockAiEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  if (import.meta.env.VITE_ENABLE_MOCK_AI === "true") {
    return true;
  }
  try {
    return localStorage.getItem("eigenraum.mockAi.enabled") === "true";
  } catch {
    return false;
  }
}

export function createAiProvider(): AiProvider {
  if (Capacitor.isNativePlatform()) {
    return new NativeAiProvider();
  }
  if (isRealWebAiEnabled()) {
    return new WebDevAiProvider();
  }
  if (mockAiEnabled()) {
    return new MockAiProvider();
  }
  return new UnavailableAiProvider();
}
