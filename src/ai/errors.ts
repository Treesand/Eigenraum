export const AI_ERROR_CODES = [
  "AI_UNAVAILABLE_ON_WEB",
  "API_KEY_MISSING",
  "API_KEY_INVALID",
  "NETWORK_OFFLINE",
  "NETWORK_TIMEOUT",
  "RATE_LIMITED",
  "OPENAI_BAD_REQUEST",
  "OPENAI_SERVER_ERROR",
  "OPENAI_REFUSAL",
  "OPENAI_INCOMPLETE",
  "RESPONSE_MISSING_TEXT",
  "RESPONSE_INVALID_JSON",
  "RESPONSE_SCHEMA_INVALID",
  "UNKNOWN",
] as const;

export type AiErrorCode = (typeof AI_ERROR_CODES)[number];

/**
 * Interner Fehler der KI-Schicht. message enthält bewusst keine
 * Nutzertexte, keine Keys und keine rohen API-Antworten.
 */
export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "AiError";
    this.code = code;
  }
}

export function isAiErrorCode(value: unknown): value is AiErrorCode {
  return typeof value === "string" && (AI_ERROR_CODES as readonly string[]).includes(value);
}

export function toAiError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }
  if (error && typeof error === "object") {
    // Capacitor-Plugin-Rejections tragen den Fehlercode in message oder code.
    const { message, code } = error as { message?: unknown; code?: unknown };
    if (isAiErrorCode(code)) {
      return new AiError(code);
    }
    if (isAiErrorCode(message)) {
      return new AiError(message);
    }
  }
  return new AiError("UNKNOWN");
}

/**
 * Zentrales Mapping von HTTP-Status auf interne Fehlercodes.
 */
export function aiErrorFromHttpStatus(status: number): AiError | null {
  if (status >= 200 && status < 300) {
    return null;
  }
  if (status === 401 || status === 403) {
    return new AiError("API_KEY_INVALID", `HTTP ${status}`);
  }
  if (status === 429) {
    return new AiError("RATE_LIMITED", `HTTP ${status}`);
  }
  if (status >= 500 && status < 600) {
    return new AiError("OPENAI_SERVER_ERROR", `HTTP ${status}`);
  }
  if (status >= 400 && status < 500) {
    return new AiError("OPENAI_BAD_REQUEST", `HTTP ${status}`);
  }
  return new AiError("UNKNOWN", `HTTP ${status}`);
}

/**
 * Nutzerfreundliche, ruhige Meldungen ohne technische Details.
 */
export function friendlyMessageFor(code: AiErrorCode): string {
  switch (code) {
    case "AI_UNAVAILABLE_ON_WEB":
      return "Im Browser wird kein Morgenbild über OpenAI erzeugt.";
    case "API_KEY_MISSING":
      return "Es ist noch kein OpenAI-Zugang eingerichtet.";
    case "API_KEY_INVALID":
      return "Der hinterlegte OpenAI-Zugang wurde nicht akzeptiert.";
    case "NETWORK_OFFLINE":
      return "Gerade besteht keine Internetverbindung.";
    case "NETWORK_TIMEOUT":
      return "Die Verbindung hat zu lange gedauert.";
    case "RATE_LIMITED":
      return "Der OpenAI-Zugang ist im Moment ausgelastet.";
    default:
      return "Die Erzeugung über OpenAI war diesmal nicht möglich.";
  }
}
