import { test, expect } from "@playwright/test";
import { completeOnboarding, fillEveningCheckout, nextMorning } from "./helpers";

/**
 * Szenario 2: Die Mock-AI wirft einen Netzwerkfehler. Der Checkout bleibt
 * erhalten, ein Fallback-Artefakt entsteht und ist am Folgetag offline sichtbar.
 */
test("KI-Fehler führt zu lokalem Fallback, offline sichtbar am Folgetag", async ({
  page,
  context,
}) => {
  await completeOnboarding(page);

  // Mock-AI auf Netzwerkfehler stellen.
  await page.evaluate(() => {
    localStorage.setItem("eigenraum.mockAi.failWith", "NETWORK_OFFLINE");
  });

  await fillEveningCheckout(page, {
    momentWithSelf: "Kurz auf dem Balkon.",
    stateLabel: "Eingeengt",
  });

  await expect(page.getByTestId("generation-status")).toHaveText(
    "Dein Checkout ist gespeichert. Das Morgenbild wurde diesmal lokal gestaltet.",
  );
  await page.getByTestId("back-home").click();

  // Der Checkout ist weiterhin vorhanden (Ansicht zeigt gespeicherten Stand).
  await page.getByTestId("open-evening").click();
  await expect(page.getByTestId("moment-with-self")).toHaveValue("Kurz auf dem Balkon.");

  // Folgetag "offline": Jeder Request, der nicht an den lokalen Dev-Server
  // geht, wird blockiert – das Artefakt muss rein aus IndexedDB kommen.
  // (Ein echtes setOffline würde auch das Laden der App selbst verhindern.)
  await context.route(
    (url) => url.hostname !== "localhost" && url.hostname !== "127.0.0.1",
    (route) => route.abort(),
  );
  await page.clock.install({ time: nextMorning() });
  await page.goto("/");

  const artifact = page.getByTestId("morning-artifact");
  await expect(artifact).toBeVisible();
  await expect(artifact).toHaveAttribute("data-status", "fallback");
  await expect(page.getByTestId("morning-phrase")).toHaveText(
    "Weite beginnt nicht erst außerhalb von dir.",
    { timeout: 15_000 },
  );
});
