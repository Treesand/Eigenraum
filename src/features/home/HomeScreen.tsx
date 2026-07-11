import { useEffect, useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { useAppState } from "../../app/app-state";
import { todayLocalDateKey } from "../../domain/date-key";
import type { MorningArtifact } from "../../domain/morning-artifact";
import type { MorningCheckin } from "../../domain/morning-checkin";
import type { EveningCheckout } from "../../domain/evening-checkout";
import { getArtifactByDate, upsertArtifactForDate } from "../../storage/artifact-repository";
import { getMorningCheckinByDate } from "../../storage/morning-repository";
import { getEveningCheckoutByDate } from "../../storage/evening-repository";
import { createNeutralArtifact } from "../../animation/fallback-spec";
import { MorningArtifactView } from "./MorningArtifactView";
import { MORNING_NEED_LABELS } from "../../domain/morning-checkin";

/**
 * Startansicht: lädt das heutige Artefakt ausschließlich aus der
 * lokalen Datenbank – es wird nie auf Netzwerk gewartet und nie
 * automatisch ein OpenAI-Aufruf gestartet.
 */
export function HomeScreen() {
  const { navigate, settings } = useAppState();
  const [artifact, setArtifact] = useState<MorningArtifact | null>(null);
  const [checkin, setCheckin] = useState<MorningCheckin | null>(null);
  const [checkout, setCheckout] = useState<EveningCheckout | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = todayLocalDateKey();
      let todayArtifact = await getArtifactByDate(today);
      if (!todayArtifact || todayArtifact.status === "pending") {
        // Kein leerer Bildschirm: ein neutrales Artefakt entsteht lokal.
        // Ein pending-Artefakt (Generierung wurde unterbrochen) wird
        // ebenfalls lokal ersetzt – niemals durch einen KI-Aufruf.
        todayArtifact = await upsertArtifactForDate(createNeutralArtifact(today));
      }
      const [todayCheckin, todayCheckout] = await Promise.all([
        getMorningCheckinByDate(today),
        getEveningCheckoutByDate(today),
      ]);
      if (!cancelled) {
        setArtifact(todayArtifact);
        setCheckin(todayCheckin ?? null);
        setCheckout(todayCheckout ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!artifact) {
    return <Page title="Eigenraum">{null}</Page>;
  }

  return (
    <Page>
      <MorningArtifactView artifact={artifact} reducedMotion={settings.reducedMotion} />

      <div className="stack">
        {checkin ? (
          <p className="muted" data-testid="home-checkin-summary">
            Heute: {MORNING_NEED_LABELS[checkin.need]}
            {checkin.permission ? ` – ${checkin.permission}` : ""}
          </p>
        ) : (
          <Button variant="primary" onClick={() => navigate("morning")}>
            Morgen-Check-in beginnen
          </Button>
        )}

        <Button onClick={() => navigate("evening")} data-testid="open-evening">
          {checkout ? "Abend-Checkout ansehen" : "Abend-Checkout"}
        </Button>
      </div>

      <div className="row" style={{ justifyContent: "center" }}>
        <Button variant="quiet" onClick={() => navigate("history")}>
          Verlauf
        </Button>
        <Button variant="quiet" onClick={() => navigate("settings")}>
          Einstellungen
        </Button>
      </div>
    </Page>
  );
}
