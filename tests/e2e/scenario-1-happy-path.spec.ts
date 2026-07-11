import { test, expect } from "@playwright/test";
import { completeOnboarding, fillEveningCheckout, nextMorning } from "./helpers";

/**
 * Szenario 1: Erstes Öffnen → Onboarding → Mock-Key → Abend-Checkout →
 * Mock-Artefakt → Neuladen → Folgetag → Artefakt kommt aus der lokalen
 * Datenbank, ohne erneuten KI-Aufruf.
 */
test("Onboarding, Checkout und Morgenartefakt am Folgetag ohne neuen KI-Aufruf", async ({
  page,
}) => {
  await completeOnboarding(page);

  await fillEveningCheckout(page, { stateLabel: "Überfordert" });
  await expect(page.getByTestId("generation-status")).toHaveText(
    "Für morgen ist etwas entstanden.",
  );

  // Genau ein Mock-KI-Aufruf fand statt.
  const calls = await page.evaluate(() => window.__eigenraumMockAiCalls ?? 0);
  expect(calls).toBe(1);

  await page.getByTestId("back-home").click();

  // App neu laden, Systemzeit auf den Folgetag stellen.
  await page.clock.install({ time: nextMorning() });
  await page.reload();

  // Das Morgenartefakt stammt aus IndexedDB (Status generated, Mock-Phrase).
  const artifact = page.getByTestId("morning-artifact");
  await expect(artifact).toBeVisible();
  await expect(artifact).toHaveAttribute("data-status", "generated");
  await expect(page.getByTestId("morning-phrase")).toHaveText(
    "Nicht jede Anfrage von gestern gehört zu dir.",
    { timeout: 15_000 },
  );

  // Es fand kein erneuter KI-Aufruf statt.
  const callsAfterReload = await page.evaluate(() => window.__eigenraumMockAiCalls ?? 0);
  expect(callsAfterReload).toBe(0);
});

declare global {
  interface Window {
    __eigenraumMockAiCalls?: number;
  }
}
