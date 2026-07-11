import { useEffect, useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { ChoiceChips } from "../../components/ChoiceChips";
import { TextArea } from "../../components/TextArea";
import { useAppState } from "../../app/app-state";
import { todayLocalDateKey } from "../../domain/date-key";
import {
  MORNING_NEEDS,
  MORNING_NEED_LABELS,
  MORNING_THREATS,
  MORNING_THREAT_LABELS,
  type MorningNeed,
  type MorningThreat,
} from "../../domain/morning-checkin";
import {
  getMorningCheckinByDate,
  saveMorningCheckin,
} from "../../storage/morning-repository";

export function MorningCheckinScreen() {
  const { navigate } = useAppState();
  const [step, setStep] = useState(0);
  const [need, setNeed] = useState<MorningNeed | null>(null);
  const [threat, setThreat] = useState<MorningThreat | null>(null);
  const [permission, setPermission] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const existing = await getMorningCheckinByDate(todayLocalDateKey());
      if (existing) {
        setNeed(existing.need);
        setThreat(existing.threat);
        setPermission(existing.permission);
      }
    })();
  }, []);

  const save = async () => {
    if (!need) {
      return;
    }
    setSaving(true);
    try {
      await saveMorningCheckin({
        date: todayLocalDateKey(),
        need,
        threat,
        permission,
      });
      navigate("home");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page>
      {step === 0 && (
        <div className="stack">
          <h1 className="page-title">Was brauchst du heute am stärksten?</h1>
          <ChoiceChips
            options={MORNING_NEEDS}
            labels={MORNING_NEED_LABELS}
            value={need}
            onChange={setNeed}
            ariaLabel="Bedürfnis heute"
          />
        </div>
      )}

      {step === 1 && (
        <div className="stack">
          <h1 className="page-title">Wovor möchtest du es heute schützen?</h1>
          <ChoiceChips
            options={MORNING_THREATS}
            labels={MORNING_THREAT_LABELS}
            value={threat}
            onChange={setThreat}
            allowDeselect
            ariaLabel="Wovor schützen"
          />
          <p className="muted small">Diese Auswahl ist freiwillig.</p>
        </div>
      )}

      {step === 2 && (
        <div className="stack">
          <h1 className="page-title">Was erlaubst du dir heute?</h1>
          <TextArea
            label=""
            aria-label="Erlaubnis heute"
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
            placeholder="Heute darf ich …"
            data-testid="permission-input"
          />
        </div>
      )}

      <div className="spacer" />

      <div className="row" style={{ justifyContent: "space-between" }}>
        <Button
          variant="quiet"
          onClick={() => (step === 0 ? navigate("home") : setStep(step - 1))}
        >
          {step === 0 ? "Abbrechen" : "Zurück"}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !need}>
            Weiter
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={save}
            disabled={!need || saving}
            data-testid="save-checkin"
          >
            Speichern
          </Button>
        )}
      </div>
    </Page>
  );
}
