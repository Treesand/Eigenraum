import { describe, expect, it } from "vitest";
import {
  buildGenerationInput,
  buildResponsesRequestBody,
  DEFAULT_AI_MODEL,
} from "./prompt-builder";
import { makeCheckout } from "../testing/fixtures";

describe("buildGenerationInput", () => {
  it("überträgt nur die vorgesehenen Felder – keine IDs, keine Daten", () => {
    const checkout = makeCheckout();
    const input = buildGenerationInput(checkout, []);
    const json = JSON.stringify(input);
    expect(json).not.toContain(checkout.id);
    expect(json).not.toContain(checkout.date);
    expect(json).not.toContain("createdAt");
    expect(input.language).toBe("de");
    expect(input.currentCheckout.state).toBe("fremdbestimmt");
    expect(input.currentCheckout.intensity).toBe(4);
  });

  it("begrenzt recentContext auf höchstens drei Einträge", () => {
    const entries = Array.from({ length: 6 }, () => ({
      state: "unruhig" as const,
      targetQuality: "softness" as const,
    }));
    const input = buildGenerationInput(makeCheckout(), entries);
    expect(input.recentContext).toHaveLength(3);
  });
});

describe("buildResponsesRequestBody", () => {
  const body = JSON.parse(
    buildResponsesRequestBody(buildGenerationInput(makeCheckout(), []), DEFAULT_AI_MODEL),
  ) as Record<string, unknown>;

  it("verwendet das zentrale Standardmodell", () => {
    expect(DEFAULT_AI_MODEL).toBe("gpt-5.6-terra");
    expect(body.model).toBe("gpt-5.6-terra");
  });

  it("setzt store: false (keine Speicherung bei OpenAI)", () => {
    expect(body.store).toBe(false);
  });

  it("verwendet kein Streaming und keine previous_response_id", () => {
    expect(body).not.toHaveProperty("stream");
    expect(body).not.toHaveProperty("previous_response_id");
  });

  it("verlangt strukturierte Ausgabe im Strict-Modus", () => {
    const text = body.text as { format: Record<string, unknown> };
    expect(text.format.type).toBe("json_schema");
    expect(text.format.name).toBe("eigenraum_morning_artifact_v1");
    expect(text.format.strict).toBe(true);
    expect(text.format.schema).toBeTypeOf("object");
  });

  it("begrenzt die Ausgabelänge und nutzt geringen Reasoning-Aufwand", () => {
    expect(body.max_output_tokens).toBe(900);
    expect((body.reasoning as { effort: string }).effort).toBe("low");
  });

  it("bleibt deutlich unter dem 64-KiB-Limit des Plugins", () => {
    const raw = buildResponsesRequestBody(
      buildGenerationInput(makeCheckout(), []),
      DEFAULT_AI_MODEL,
    );
    expect(new TextEncoder().encode(raw).length).toBeLessThan(64 * 1024);
  });
});
