import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EveningCheckoutScreen } from "./EveningCheckoutScreen";
import { renderWithAppState } from "../../testing/render-helpers";
import { TestAiProvider } from "../../testing/mock-ai";
import { getDatabase } from "../../storage/database";
import { getEveningCheckoutByDate } from "../../storage/evening-repository";
import { todayLocalDateKey, addLocalDays } from "../../domain/date-key";
import { getArtifactByDate } from "../../storage/artifact-repository";

async function clearDatabase() {
  const db = getDatabase();
  await Promise.all([
    db.morningCheckins.clear(),
    db.eveningCheckouts.clear(),
    db.morningArtifacts.clear(),
    db.settings.clear(),
  ]);
}

describe("EveningCheckoutScreen", () => {
  beforeEach(clearDatabase);

  it("erlaubt das Speichern erst mit Zustand und mindestens einem Textfeld", async () => {
    const user = userEvent.setup();
    renderWithAppState(<EveningCheckoutScreen />);

    const save = screen.getByTestId("save-checkout");
    expect(save).toBeDisabled();

    // Nur Zustand: reicht nicht.
    await user.click(screen.getByRole("button", { name: "Unruhig" }));
    expect(save).toBeDisabled();

    // Ein Textfeld dazu: jetzt möglich.
    await user.type(screen.getByTestId("what-helped"), "Ein Spaziergang.");
    expect(save).toBeEnabled();
  });

  it("speichert den Checkout und zeigt die ruhige Erfolgsmeldung", async () => {
    const user = userEvent.setup();
    const provider = new TestAiProvider();
    renderWithAppState(<EveningCheckoutScreen />, { provider });

    await user.type(screen.getByTestId("moment-with-self"), "Beim Kaffee am Morgen.");
    await user.click(screen.getByRole("button", { name: "Überfordert" }));
    await user.click(screen.getByTestId("save-checkout"));

    await waitFor(() => {
      expect(screen.getByTestId("generation-status")).toHaveTextContent(
        "Für morgen ist etwas entstanden.",
      );
    });

    const stored = await getEveningCheckoutByDate(todayLocalDateKey());
    expect(stored?.momentWithSelf).toBe("Beim Kaffee am Morgen.");
    expect(stored?.state).toBe("ueberfordert");
  });

  it("zeigt bei KI-Fehler die Fallback-Meldung und behält den Checkout", async () => {
    const user = userEvent.setup();
    const provider = new TestAiProvider();
    provider.failWith = "NETWORK_OFFLINE";
    renderWithAppState(<EveningCheckoutScreen />, { provider });

    await user.type(screen.getByTestId("what-was-missing"), "Freier Raum.");
    await user.click(screen.getByRole("button", { name: "Eingeengt" }));
    await user.click(screen.getByTestId("save-checkout"));

    await waitFor(() => {
      expect(screen.getByTestId("generation-status")).toHaveTextContent(
        "Dein Checkout ist gespeichert. Das Morgenbild wurde diesmal lokal gestaltet.",
      );
    });

    const stored = await getEveningCheckoutByDate(todayLocalDateKey());
    expect(stored?.state).toBe("eingeengt");

    const artifact = await getArtifactByDate(addLocalDays(todayLocalDateKey(), 1));
    expect(artifact?.status).toBe("fallback");
  });

  it("zeigt ohne eingerichteten Key eine Einrichtungs-Notiz", () => {
    renderWithAppState(<EveningCheckoutScreen />, { keyConfigured: false });
    expect(screen.getByTestId("missing-key-hint")).toBeInTheDocument();
  });

  it("zeigt mit eingerichtetem Key keine Einrichtungs-Notiz", () => {
    renderWithAppState(<EveningCheckoutScreen />, { keyConfigured: true });
    expect(screen.queryByTestId("missing-key-hint")).not.toBeInTheDocument();
  });
});
