import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { generateMorningArtifact } from "./generation-service";
import { TestAiProvider } from "../testing/mock-ai";
import { saveEveningCheckout } from "../storage/evening-repository";
import { getArtifactByDate } from "../storage/artifact-repository";
import { getEveningCheckoutByDate } from "../storage/evening-repository";
import { getDatabase } from "../storage/database";
import { DEFAULT_SETTINGS } from "../storage/settings-repository";

async function makeStoredCheckout(date = "2026-07-11") {
  return saveEveningCheckout({
    date,
    momentWithSelf: "Beim Lesen.",
    momentOfLeavingSelf: "",
    whatHelped: "",
    whatWasMissing: "",
    state: "ueberfordert",
    intensity: 3,
  });
}

describe("generateMorningArtifact", () => {
  beforeEach(async () => {
    const db = getDatabase();
    await Promise.all([
      db.morningCheckins.clear(),
      db.eveningCheckouts.clear(),
      db.morningArtifacts.clear(),
      db.settings.clear(),
    ]);
  });

  it("speichert bei Erfolg ein generiertes Artefakt für den Folgetag", async () => {
    const provider = new TestAiProvider();
    const checkout = await makeStoredCheckout();

    const outcome = await generateMorningArtifact(checkout, provider, DEFAULT_SETTINGS);

    expect(outcome.usedFallback).toBe(false);
    expect(outcome.artifact.status).toBe("generated");
    expect(outcome.artifact.targetDate).toBe("2026-07-12");
    expect(outcome.artifact.model).toBe(DEFAULT_SETTINGS.aiModel);

    const stored = await getArtifactByDate("2026-07-12");
    expect(stored?.status).toBe("generated");
    expect(stored?.sourceCheckoutId).toBe(checkout.id);
  });

  it("erzeugt bei einem KI-Fehler ein Fallback-Artefakt und behält den Checkout", async () => {
    const provider = new TestAiProvider();
    provider.failWith = "NETWORK_OFFLINE";
    const checkout = await makeStoredCheckout();

    const outcome = await generateMorningArtifact(checkout, provider, DEFAULT_SETTINGS);

    expect(outcome.usedFallback).toBe(true);
    expect(outcome.errorCode).toBe("NETWORK_OFFLINE");

    const artifact = await getArtifactByDate("2026-07-12");
    expect(artifact?.status).toBe("fallback");
    expect(artifact?.generationErrorCode).toBe("NETWORK_OFFLINE");
    expect(artifact?.phrase).toBe("Nicht alles braucht heute deinen Zugriff.");

    // Der Checkout geht nie verloren.
    const storedCheckout = await getEveningCheckoutByDate("2026-07-11");
    expect(storedCheckout?.id).toBe(checkout.id);
  });

  it("ersetzt ein bestehendes Artefakt desselben Zieldatums statt zu doppeln", async () => {
    const provider = new TestAiProvider();
    const checkout = await makeStoredCheckout();

    const first = await generateMorningArtifact(checkout, provider, DEFAULT_SETTINGS);
    const second = await generateMorningArtifact(checkout, provider, DEFAULT_SETTINGS);

    expect(second.artifact.id).toBe(first.artifact.id);
    const db = getDatabase();
    const all = await db.morningArtifacts.where("targetDate").equals("2026-07-12").toArray();
    expect(all).toHaveLength(1);
  });

  it("reicht Modell- und Thinking-Einstellung an den Provider durch", async () => {
    const provider = new TestAiProvider();
    const checkout = await makeStoredCheckout();
    await generateMorningArtifact(checkout, provider, {
      ...DEFAULT_SETTINGS,
      aiModel: "gpt-5.6-sol",
      reasoningEffort: "medium",
    });
    expect(provider.calls[0]?.model).toBe("gpt-5.6-sol");
    expect(provider.calls[0]?.reasoningEffort).toBe("medium");
  });

  it("respektiert contextDepth 0 (kein recentContext)", async () => {
    const provider = new TestAiProvider();
    const checkout = await makeStoredCheckout();
    await generateMorningArtifact(checkout, provider, {
      ...DEFAULT_SETTINGS,
      contextDepth: 0,
    });
    expect(provider.calls[0]?.recentContext).toEqual([]);
  });

  it("liefert höchstens drei vorherige Zustände als Kontext", async () => {
    const provider = new TestAiProvider();
    for (let day = 5; day <= 10; day += 1) {
      const past = await makeStoredCheckout(`2026-07-${String(day).padStart(2, "0")}`);
      await generateMorningArtifact(past, provider, DEFAULT_SETTINGS);
    }
    provider.calls = [];

    const checkout = await makeStoredCheckout("2026-07-11");
    await generateMorningArtifact(checkout, provider, DEFAULT_SETTINGS);

    const context = provider.calls[0]?.recentContext ?? [];
    expect(context.length).toBeLessThanOrEqual(3);
    expect(context.length).toBeGreaterThan(0);
    for (const entry of context) {
      expect(entry.state).toBe("ueberfordert");
      expect(entry.targetQuality).toBeDefined();
    }
  });
});
