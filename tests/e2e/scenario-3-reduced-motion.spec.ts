import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers";

/**
 * Szenario 3: Bei aktivierter Reduced Motion gibt es keine lange
 * Canvas-Animation – das statische Endbild und der Satz erscheinen sofort.
 */
test("Reduced Motion zeigt statisches Bild und Satz ohne Bewegungsphase", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();

  await completeOnboarding(page);

  const canvas = page.getByTestId("morning-canvas");
  await expect(canvas).toHaveAttribute("data-reduced-motion", "true");

  // Der Satz ist praktisch sofort sichtbar – deutlich schneller als die
  // reguläre Animationsdauer von mindestens 3,2 Sekunden.
  const start = Date.now();
  await expect(page.getByTestId("morning-phrase")).toHaveClass(/visible/, {
    timeout: 2_000,
  });
  expect(Date.now() - start).toBeLessThan(2_000);

  await expect(page.getByTestId("morning-phrase")).toHaveText(
    "Du musst dich heute nicht sofort erklären.",
  );

  await context.close();
});

/** Gegenprobe: auch die App-Einstellung erzwingt das statische Bild. */
test("App-Einstellung Reduzierte Bewegung wirkt wie die Systemeinstellung", async ({
  page,
}) => {
  await completeOnboarding(page);

  await page.getByRole("button", { name: "Einstellungen" }).click();
  await page.getByLabel("Reduzierte Bewegung").check();
  await page.getByRole("button", { name: "Zurück" }).click();

  await expect(page.getByTestId("morning-canvas")).toHaveAttribute(
    "data-reduced-motion",
    "true",
  );
});
