import { describe, expect, it } from "vitest";
import { hashStringToSeed, mulberry32, randomBetween } from "./seeded-random";

describe("mulberry32", () => {
  it("ist für denselben Seed deterministisch", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it("liefert für verschiedene Seeds verschiedene Folgen", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("liefert Werte in [0, 1)", () => {
    const random = mulberry32(2026);
    for (let i = 0; i < 1000; i += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("randomBetween", () => {
  it("bleibt im angegebenen Bereich", () => {
    const random = mulberry32(7);
    for (let i = 0; i < 200; i += 1) {
      const value = randomBetween(random, -5, 5);
      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});

describe("hashStringToSeed", () => {
  it("ist stabil für denselben Eingabewert", () => {
    expect(hashStringToSeed("checkout-1" + "2026-07-12")).toBe(
      hashStringToSeed("checkout-12026-07-12"),
    );
  });

  it("liefert unterschiedliche Seeds für unterschiedliche Eingaben", () => {
    expect(hashStringToSeed("a")).not.toBe(hashStringToSeed("b"));
  });

  it("bleibt im gültigen Seed-Bereich", () => {
    for (const input of ["", "x", "checkout-abc2026-01-01", "🌱"]) {
      const seed = hashStringToSeed(input);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThanOrEqual(2_147_483_647);
    }
  });
});
