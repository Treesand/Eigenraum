import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MorningArtifactView } from "./MorningArtifactView";
import { createFallbackArtifact, createNeutralArtifact } from "../../animation/fallback-spec";
import { makeCheckout } from "../../testing/fixtures";

describe("MorningArtifactView", () => {
  it("zeigt bei Reduced Motion sofort das statische Bild und den Satz", async () => {
    const artifact = createFallbackArtifact(makeCheckout(), "2026-07-12");
    render(<MorningArtifactView artifact={artifact} reducedMotion={true} />);

    const canvas = screen.getByTestId("morning-canvas");
    expect(canvas).toHaveAttribute("data-reduced-motion", "true");

    // Satz erscheint nach höchstens 250 ms.
    await waitFor(
      () => {
        expect(screen.getByTestId("morning-phrase")).toHaveClass("visible");
      },
      { timeout: 250 },
    );
    expect(screen.getByTestId("morning-phrase")).toHaveTextContent(artifact.phrase);
  });

  it("zeigt ein Fallback-Artefakt ohne Fehlerzustand an", () => {
    const artifact = createNeutralArtifact("2026-07-11");
    render(<MorningArtifactView artifact={artifact} reducedMotion={true} />);
    expect(screen.getByTestId("morning-artifact")).toHaveAttribute("data-status", "fallback");
    expect(screen.getByTestId("morning-phrase")).toHaveTextContent(
      "Du musst dich heute nicht sofort erklären.",
    );
  });
});
