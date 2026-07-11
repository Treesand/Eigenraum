import { useEffect, useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { useAppState } from "../../app/app-state";
import { listMorningCheckins } from "../../storage/morning-repository";
import { listEveningCheckouts } from "../../storage/evening-repository";
import { listArtifacts } from "../../storage/artifact-repository";
import type { MorningCheckin } from "../../domain/morning-checkin";
import type { EveningCheckout } from "../../domain/evening-checkout";
import type { MorningArtifact } from "../../domain/morning-artifact";
import { MORNING_NEED_LABELS } from "../../domain/morning-checkin";
import { EVENING_STATE_LABELS } from "../../domain/evening-checkout";
import type { LocalDateKey } from "../../domain/date-key";

interface HistoryDay {
  date: LocalDateKey;
  artifact?: MorningArtifact;
  checkin?: MorningCheckin;
  checkout?: EveningCheckout;
}

function formatDate(dateKey: LocalDateKey): string {
  const [year, month, day] = dateKey.split("-");
  return `${day}.${month}.${year}`;
}

/**
 * Chronologischer Verlauf ohne Bewertung: pro Tag Morgensatz,
 * Bedürfnis, Erlaubnis, Abendzustand und ausklappbare eigene Texte.
 * Keine Diagramme, keine „guten“ oder „schlechten“ Tage.
 */
export function HistoryScreen() {
  const { navigate } = useAppState();
  const [days, setDays] = useState<HistoryDay[] | null>(null);

  useEffect(() => {
    (async () => {
      const [checkins, checkouts, artifacts] = await Promise.all([
        listMorningCheckins(),
        listEveningCheckouts(),
        listArtifacts(),
      ]);

      const byDate = new Map<LocalDateKey, HistoryDay>();
      const ensure = (date: LocalDateKey): HistoryDay => {
        let day = byDate.get(date);
        if (!day) {
          day = { date };
          byDate.set(date, day);
        }
        return day;
      };

      for (const artifact of artifacts) {
        if (artifact.status === "generated" || artifact.status === "fallback") {
          ensure(artifact.targetDate).artifact = artifact;
        }
      }
      for (const checkin of checkins) {
        ensure(checkin.date).checkin = checkin;
      }
      for (const checkout of checkouts) {
        ensure(checkout.date).checkout = checkout;
      }

      setDays(
        [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
      );
    })();
  }, []);

  return (
    <Page title="Verlauf">
      {days && days.length === 0 && (
        <p className="muted">Noch keine Einträge. Der Verlauf entsteht Tag für Tag.</p>
      )}

      <div>
        {days?.map((day) => (
          <article key={day.date} className="history-entry" data-testid="history-entry">
            <p className="muted small">{formatDate(day.date)}</p>

            {day.artifact && day.artifact.phrase && (
              <p className="history-phrase">{day.artifact.phrase}</p>
            )}

            {day.checkin && (
              <p className="muted">
                Bedürfnis: {MORNING_NEED_LABELS[day.checkin.need]}
                {day.checkin.permission ? ` · Erlaubnis: ${day.checkin.permission}` : ""}
              </p>
            )}

            {day.checkout && (
              <p className="muted">Abend: {EVENING_STATE_LABELS[day.checkout.state]}</p>
            )}

            {day.checkout && (
              <details className="history-details">
                <summary>Eigene Texte</summary>
                <div className="stack" style={{ paddingTop: "var(--space-2)" }}>
                  {day.checkout.momentWithSelf && (
                    <p className="small">Bei mir: {day.checkout.momentWithSelf}</p>
                  )}
                  {day.checkout.momentOfLeavingSelf && (
                    <p className="small">Verlassen: {day.checkout.momentOfLeavingSelf}</p>
                  )}
                  {day.checkout.whatHelped && (
                    <p className="small">Gutgetan: {day.checkout.whatHelped}</p>
                  )}
                  {day.checkout.whatWasMissing && (
                    <p className="small">Gefehlt: {day.checkout.whatWasMissing}</p>
                  )}
                </div>
              </details>
            )}
          </article>
        ))}
      </div>

      <div className="spacer" />
      <div className="row">
        <Button variant="quiet" onClick={() => navigate("home")}>
          Zurück
        </Button>
      </div>
    </Page>
  );
}
