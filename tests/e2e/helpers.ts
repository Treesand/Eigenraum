import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Durchläuft das Onboarding inklusive Mock-Key-Einrichtung. */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText("Ohne Aufgaben, Punkte und Selbstoptimierung.")).toBeVisible();

  await page.getByTestId("onboarding-next").click(); // Seite 2: Datenhinweis
  await page.getByTestId("onboarding-next").click(); // Seite 3: Key

  await page.getByTestId("setup-openai-key").click();
  await expect(page.getByText("Zugang eingerichtet.")).toBeVisible();

  await page.getByTestId("onboarding-next").click(); // Seite 4
  await page.getByTestId("onboarding-finish").click();

  await expect(page.getByTestId("morning-artifact")).toBeVisible();
}

export interface CheckoutInput {
  momentWithSelf?: string;
  stateLabel: string;
}

/** Füllt den Abend-Checkout aus und schließt ihn ab. */
export async function fillEveningCheckout(page: Page, input: CheckoutInput): Promise<void> {
  await page.getByTestId("open-evening").click();
  await page
    .getByTestId("moment-with-self")
    .fill(input.momentWithSelf ?? "Beim Lesen am Abend.");
  await page.getByRole("button", { name: input.stateLabel, exact: true }).click();
  await page.getByTestId("save-checkout").click();
}

/** Morgen des Folgetags: fixiert die Zeit auf 08:00 lokal am nächsten Tag. */
export function nextMorning(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 0, 0, 0);
  return date;
}
