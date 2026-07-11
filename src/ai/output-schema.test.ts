import { describe, expect, it } from "vitest";
import {
  buildOpenAiOutputJsonSchema,
  GeneratedArtifactOutputSchema,
} from "./output-schema";
import { makeGeneratedOutput } from "../testing/fixtures";

interface Node {
  [key: string]: unknown;
  type?: string;
  properties?: Record<string, Node>;
  items?: Node;
  required?: string[];
  additionalProperties?: boolean;
}

function collectObjects(node: Node, path: string, out: Array<{ path: string; node: Node }>) {
  if (node.type === "object") {
    out.push({ path, node });
  }
  if (node.properties) {
    for (const [key, child] of Object.entries(node.properties)) {
      collectObjects(child, `${path}.${key}`, out);
    }
  }
  if (node.items) {
    collectObjects(node.items, `${path}[]`, out);
  }
}

describe("GeneratedArtifactOutputSchema (Zod)", () => {
  it("akzeptiert eine gültige Ausgabe", () => {
    expect(GeneratedArtifactOutputSchema.safeParse(makeGeneratedOutput()).success).toBe(true);
  });

  it("lehnt unbekannte Enum-Werte ab", () => {
    const output = makeGeneratedOutput();
    const broken = {
      ...output,
      interpretation: { ...output.interpretation, targetQuality: "hustle" },
    };
    expect(GeneratedArtifactOutputSchema.safeParse(broken).success).toBe(false);
  });

  it("lehnt zusätzliche Felder ab", () => {
    const broken = { ...makeGeneratedOutput(), score: 10 };
    expect(GeneratedArtifactOutputSchema.safeParse(broken).success).toBe(false);
  });

  it("lehnt fehlende Felder ab", () => {
    const { animation: _animation, ...rest } = makeGeneratedOutput();
    expect(GeneratedArtifactOutputSchema.safeParse(rest).success).toBe(false);
  });

  it("akzeptiert Werte außerhalb der Zahlbereiche (Klemmen erfolgt separat)", () => {
    const output = makeGeneratedOutput();
    const outOfRange = {
      ...output,
      animation: { ...output.animation, saturation: 3, durationMs: 100 },
    };
    expect(GeneratedArtifactOutputSchema.safeParse(outOfRange).success).toBe(true);
  });
});

describe("buildOpenAiOutputJsonSchema", () => {
  const schema = buildOpenAiOutputJsonSchema() as Node;

  it("setzt auf jedem Objekt additionalProperties: false", () => {
    const objects: Array<{ path: string; node: Node }> = [];
    collectObjects(schema, "$", objects);
    expect(objects.length).toBeGreaterThan(0);
    for (const { path, node } of objects) {
      expect(node.additionalProperties, path).toBe(false);
    }
  });

  it("markiert auf jedem Objekt alle Felder als erforderlich", () => {
    const objects: Array<{ path: string; node: Node }> = [];
    collectObjects(schema, "$", objects);
    for (const { path, node } of objects) {
      const keys = Object.keys(node.properties ?? {});
      expect(node.required, path).toEqual(keys);
    }
  });

  it("enthält weder reguläre Ausdrücke noch bedingte Konstrukte", () => {
    const json = JSON.stringify(schema);
    expect(json).not.toContain('"pattern"');
    expect(json).not.toContain('"if"');
    expect(json).not.toContain('"anyOf"');
    expect(json).not.toContain('"oneOf"');
    expect(json).not.toContain('"$ref"');
  });

  it("überträgt die Wertebereiche aus SPEC_LIMITS", () => {
    const animation = schema.properties?.animation as Node;
    const durationMs = animation.properties?.durationMs as Node;
    expect(durationMs.minimum).toBe(3_200);
    expect(durationMs.maximum).toBe(5_000);

    const layers = animation.properties?.layers as Node;
    expect(layers.maxItems).toBe(4);
    const count = (layers.items as Node).properties?.count as Node;
    expect(count.minimum).toBe(1);
    expect(count.maximum).toBe(14);
  });

  it("begrenzt die Phrase auf 90 Zeichen", () => {
    const phrase = schema.properties?.phrase as Node;
    expect(phrase.maxLength).toBe(90);
  });

  it("beschreibt seed als Integer", () => {
    const animation = schema.properties?.animation as Node;
    const seed = animation.properties?.seed as Node;
    expect(seed.type).toBe("integer");
  });
});
