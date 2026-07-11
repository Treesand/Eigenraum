import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MorningCheckinScreen } from "./MorningCheckinScreen";
import { renderWithAppState } from "../../testing/render-helpers";
import { getDatabase } from "../../storage/database";
import { getMorningCheckinByDate } from "../../storage/morning-repository";
import { todayLocalDateKey } from "../../domain/date-key";
import { waitFor } from "@testing-library/react";

describe("MorningCheckinScreen", () => {
  beforeEach(async () => {
    await getDatabase().morningCheckins.clear();
  });

  it("speichert Bedürfnis, Schutz und Erlaubnis", async () => {
    const user = userEvent.setup();
    let navigatedTo: string | null = null;
    renderWithAppState(<MorningCheckinScreen />, {
      navigate: (route) => {
        navigatedTo = route;
      },
    });

    // Schritt 1: Bedürfnis
    await user.click(screen.getByRole("button", { name: "Ruhe" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    // Schritt 2: Schutz (optional)
    await user.click(screen.getByRole("button", { name: "Erwartungen" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));

    // Schritt 3: Erlaubnis
    await user.type(
      screen.getByTestId("permission-input"),
      "Heute darf ich einen Abend nicht sinnvoll nutzen.",
    );
    await user.click(screen.getByTestId("save-checkin"));

    await waitFor(async () => {
      const stored = await getMorningCheckinByDate(todayLocalDateKey());
      expect(stored?.need).toBe("ruhe");
      expect(stored?.threat).toBe("erwartungen");
      expect(stored?.permission).toBe("Heute darf ich einen Abend nicht sinnvoll nutzen.");
    });
    expect(navigatedTo).toBe("home");
  });

  it("verlangt ein Bedürfnis, bevor es weitergeht", () => {
    renderWithAppState(<MorningCheckinScreen />);
    expect(screen.getByRole("button", { name: "Weiter" })).toBeDisabled();
  });

  it("aktualisiert den bestehenden Check-in desselben Tages", async () => {
    const user = userEvent.setup();
    renderWithAppState(<MorningCheckinScreen />);

    await user.click(screen.getByRole("button", { name: "Klarheit" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    await user.click(screen.getByTestId("save-checkin"));

    await waitFor(async () => {
      expect((await getMorningCheckinByDate(todayLocalDateKey()))?.need).toBe("klarheit");
    });

    const all = await getDatabase().morningCheckins.toArray();
    expect(all).toHaveLength(1);
  });
});
