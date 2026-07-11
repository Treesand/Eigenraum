import { describe, expect, it } from "vitest";
import { parseResponsesHttpResult } from "./response-parser";
import { AiError } from "./errors";
import { makeGeneratedOutput, makeResponsesApiBody } from "../testing/fixtures";

function expectAiError(fn: () => unknown, code: string) {
  try {
    fn();
    expect.fail(`Erwarteter AiError ${code} wurde nicht geworfen`);
  } catch (error) {
    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe(code);
  }
}

describe("parseResponsesHttpResult – Erfolgsfall", () => {
  it("extrahiert, validiert und normalisiert eine gültige Antwort", () => {
    const output = makeGeneratedOutput();
    const result = parseResponsesHttpResult(200, makeResponsesApiBody(JSON.stringify(output)));
    expect(result.phrase).toBe(output.phrase);
    expect(result.interpretation.targetQuality).toBe("boundary");
    expect(result.animation.seed).toBe(output.animation.seed);
  });

  it("klemmt Werte außerhalb der Bereiche", () => {
    const output = makeGeneratedOutput();
    output.animation = { ...output.animation, durationMs: 60_000, saturation: 3 };
    const result = parseResponsesHttpResult(200, makeResponsesApiBody(JSON.stringify(output)));
    expect(result.animation.durationMs).toBe(5_000);
    expect(result.animation.saturation).toBe(0.65);
  });

  it("kürzt überlange Phrasen auf 90 Zeichen", () => {
    const output = makeGeneratedOutput();
    output.phrase = "Ein Satz der viel zu lang geraten ist und deshalb gekürzt wird ".repeat(3);
    const result = parseResponsesHttpResult(200, makeResponsesApiBody(JSON.stringify(output)));
    expect(result.phrase.length).toBeLessThanOrEqual(90);
  });
});

describe("parseResponsesHttpResult – HTTP-Fehlermapping", () => {
  it("mappt 400 auf OPENAI_BAD_REQUEST", () => {
    expectAiError(() => parseResponsesHttpResult(400, "{}"), "OPENAI_BAD_REQUEST");
  });

  it("mappt 401 auf API_KEY_INVALID", () => {
    expectAiError(() => parseResponsesHttpResult(401, "{}"), "API_KEY_INVALID");
  });

  it("mappt 403 auf API_KEY_INVALID", () => {
    expectAiError(() => parseResponsesHttpResult(403, "{}"), "API_KEY_INVALID");
  });

  it("mappt 429 auf RATE_LIMITED", () => {
    expectAiError(() => parseResponsesHttpResult(429, "{}"), "RATE_LIMITED");
  });

  it("mappt 500–599 auf OPENAI_SERVER_ERROR", () => {
    expectAiError(() => parseResponsesHttpResult(500, "{}"), "OPENAI_SERVER_ERROR");
    expectAiError(() => parseResponsesHttpResult(503, "{}"), "OPENAI_SERVER_ERROR");
    expectAiError(() => parseResponsesHttpResult(599, "{}"), "OPENAI_SERVER_ERROR");
  });
});

describe("parseResponsesHttpResult – Antwortstruktur", () => {
  it("behandelt status incomplete", () => {
    const body = JSON.stringify({ status: "incomplete", output: [] });
    expectAiError(() => parseResponsesHttpResult(200, body), "OPENAI_INCOMPLETE");
  });

  it("behandelt Refusal-Content", () => {
    const body = JSON.stringify({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "Ich kann dabei nicht helfen." }],
        },
      ],
    });
    expectAiError(() => parseResponsesHttpResult(200, body), "OPENAI_REFUSAL");
  });

  it("behandelt fehlendes output_text", () => {
    const body = JSON.stringify({
      status: "completed",
      output: [{ type: "reasoning", summary: [] }],
    });
    expectAiError(() => parseResponsesHttpResult(200, body), "RESPONSE_MISSING_TEXT");
  });

  it("behandelt ungültiges JSON im HTTP-Body", () => {
    expectAiError(() => parseResponsesHttpResult(200, "kein json"), "RESPONSE_INVALID_JSON");
  });

  it("behandelt ungültiges JSON im output_text", () => {
    const body = makeResponsesApiBody("{ phrase: kaputt");
    expectAiError(() => parseResponsesHttpResult(200, body), "RESPONSE_INVALID_JSON");
  });

  it("behandelt Schemafehler im output_text", () => {
    const body = makeResponsesApiBody(JSON.stringify({ phrase: "ok" }));
    expectAiError(() => parseResponsesHttpResult(200, body), "RESPONSE_SCHEMA_INVALID");
  });

  it("behandelt unbekannte Enums als Schemafehler (Fallback statt Absturz)", () => {
    const output = makeGeneratedOutput();
    const broken = JSON.parse(JSON.stringify(output)) as Record<string, unknown>;
    (broken.animation as Record<string, unknown>).backgroundStyle = "laser_show";
    expectAiError(
      () => parseResponsesHttpResult(200, makeResponsesApiBody(JSON.stringify(broken))),
      "RESPONSE_SCHEMA_INVALID",
    );
  });
});
