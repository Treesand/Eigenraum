import { AiError, aiErrorFromHttpStatus } from "./errors";
import {
  GeneratedArtifactOutputSchema,
  type GeneratedArtifactOutput,
} from "./output-schema";
import { hasKnownEnums, normalizeAnimationSpec } from "../animation/normalize-spec";
import { clampPhrase } from "../domain/morning-artifact";

interface ResponsesApiContentItem {
  type?: string;
  text?: string;
  refusal?: string;
}

interface ResponsesApiOutputItem {
  type?: string;
  content?: ResponsesApiContentItem[];
}

interface ResponsesApiBody {
  status?: string;
  output?: ResponsesApiOutputItem[];
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new AiError("RESPONSE_INVALID_JSON");
  }
}

/**
 * Extrahiert den output_text aus einer Responses-API-Antwort
 * (ohne SDK): output[] → type === "message" → content[] →
 * type === "output_text" → text.
 */
export function extractOutputText(body: ResponsesApiBody): string {
  const outputs = Array.isArray(body.output) ? body.output : [];

  for (const item of outputs) {
    if (item.type !== "message" || !Array.isArray(item.content)) {
      continue;
    }
    for (const content of item.content) {
      if (content.type === "refusal") {
        throw new AiError("OPENAI_REFUSAL");
      }
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new AiError("RESPONSE_MISSING_TEXT");
}

/**
 * Verarbeitet das rohe HTTP-Ergebnis des nativen Plugins:
 * Statusmapping, Parsing, Refusal/Incomplete, Zod-Validierung,
 * Normalisierung und Phrase-Begrenzung.
 */
export function parseResponsesHttpResult(
  status: number,
  rawBody: string,
): GeneratedArtifactOutput {
  const httpError = aiErrorFromHttpStatus(status);
  if (httpError) {
    throw httpError;
  }

  const body = parseJson(rawBody) as ResponsesApiBody;

  if (body.status === "incomplete") {
    throw new AiError("OPENAI_INCOMPLETE");
  }

  const outputText = extractOutputText(body);
  const parsedOutput = parseJson(outputText);

  const validation = GeneratedArtifactOutputSchema.safeParse(parsedOutput);
  if (!validation.success) {
    throw new AiError("RESPONSE_SCHEMA_INVALID");
  }

  const result = validation.data;

  // Unbekannte Enum-Werte dürfen nie zum Absturz führen –
  // sie lösen (wie Schemafehler) das lokale Fallback-Artefakt aus.
  if (!hasKnownEnums(result.animation)) {
    throw new AiError("RESPONSE_SCHEMA_INVALID");
  }

  const phrase = clampPhrase(result.phrase);
  if (phrase.length === 0) {
    throw new AiError("RESPONSE_SCHEMA_INVALID");
  }

  return {
    phrase,
    interpretation: {
      ...result.interpretation,
      shortRationale: result.interpretation.shortRationale.trim(),
    },
    animation: normalizeAnimationSpec(result.animation),
  };
}
