import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsScreen } from "./SettingsScreen";
import { renderWithAppState } from "../../testing/render-helpers";

describe("SettingsScreen – Modell und Nachdenken", () => {
  it("zeigt die Dropdowns mit Terra als Standardmodell und kurzem Nachdenken", () => {
    renderWithAppState(<SettingsScreen />);

    const modelSelect = screen.getByTestId("model-select") as HTMLSelectElement;
    expect(modelSelect.value).toBe("gpt-5.6-terra");
    expect(Array.from(modelSelect.options).map((option) => option.textContent)).toEqual([
      "Terra",
      "Sol",
      "Luna",
    ]);

    const reasoningSelect = screen.getByTestId("reasoning-select") as HTMLSelectElement;
    expect(reasoningSelect.value).toBe("low");
    expect(Array.from(reasoningSelect.options).map((option) => option.value)).toEqual([
      "minimal",
      "low",
      "medium",
      "high",
    ]);
  });

  it("übergibt eine Modellauswahl an updateSettings", async () => {
    const user = userEvent.setup();
    const updateSettings = vi.fn(async () => undefined);
    renderWithAppState(<SettingsScreen />, { updateSettings });

    await user.selectOptions(screen.getByTestId("model-select"), "gpt-5.6-luna");
    expect(updateSettings).toHaveBeenCalledWith({ aiModel: "gpt-5.6-luna" });
  });

  it("übergibt eine Thinking-Auswahl an updateSettings", async () => {
    const user = userEvent.setup();
    const updateSettings = vi.fn(async () => undefined);
    renderWithAppState(<SettingsScreen />, { updateSettings });

    await user.selectOptions(screen.getByTestId("reasoning-select"), "high");
    expect(updateSettings).toHaveBeenCalledWith({ reasoningEffort: "high" });
  });

  it("zeigt die Beschreibung der gewählten Optionen", () => {
    renderWithAppState(<SettingsScreen />, {
      settings: { aiModel: "gpt-5.6-sol", reasoningEffort: "high" },
    });
    expect(screen.getByText("Leistungsstärker, teurer")).toBeInTheDocument();
    expect(screen.getByText("Ausführliches Nachdenken, langsamer")).toBeInTheDocument();
  });
});
