import { useEffect, useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { ChoiceChips } from "../../components/ChoiceChips";
import { TextArea } from "../../components/TextArea";
import { ErrorNotice } from "../../components/ErrorNotice";
import { useAppState } from "../../app/app-state";
import { todayLocalDateKey } from "../../domain/date-key";
import {
  EVENING_STATES,
  EVENING_STATE_LABELS,
  hasAtLeastOneCheckoutText,
  type EveningIntensity,
  type EveningState,
} from "../../domain/evening-checkout";
import {
  getEveningCheckoutByDate,
  saveEveningCheckout,
} from "../../storage/evening-repository";
import { generateMorningArtifact } from "../../ai/generation-service";
import { friendlyMessageFor, toAiError } from "../../ai/errors";

type Phase = "editing" | "generating" | "done" | "fallback";

const INTENSITIES: readonly EveningIntensity[] = [1, 2, 3, 4, 5];

export function EveningCheckoutScreen() {
  const { navigate, settings, aiProvider, keyConfigured } = useAppState();

  const [momentWithSelf, setMomentWithSelf] = useState("");
  const [momentOfLeavingSelf, setMomentOfLeavingSelf] = useState("");
  const [whatHelped, setWhatHelped] = useState("");
  const [whatWasMissing, setWhatWasMissing] = useState("");
  const [state, setState] = useState<EveningState | null>(null);
  const [intensity, setIntensity] = useState<EveningIntensity>(3);
  const [phase, setPhase] = useState<Phase>("editing");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const existing = await getEveningCheckoutByDate(todayLocalDateKey());
      if (existing) {
        setMomentWithSelf(existing.momentWithSelf);
        setMomentOfLeavingSelf(existing.momentOfLeavingSelf);
        setWhatHelped(existing.whatHelped);
        setWhatWasMissing(existing.whatWasMissing);
        setState(existing.state);
        setIntensity(existing.intensity);
      }
    })();
  }, []);

  const texts = { momentWithSelf, momentOfLeavingSelf, whatHelped, whatWasMissing };
  const canSave = state !== null && hasAtLeastOneCheckoutText(texts);

  const save = async () => {
    if (!state || !canSave) {
      setNotice("Mindestens ein Feld darf nicht leer sein.");
      return;
    }
    setNotice(null);

    // 1. Checkout wird zuerst lokal gespeichert – er geht nie verloren.
    const checkout = await saveEveningCheckout({
      date: todayLocalDateKey(),
      ...texts,
      state,
      intensity,
    });

    // 2. Danach entsteht das Morgenbild (KI oder lokaler Fallback).
    setPhase("generating");
    try {
      const outcome = await generateMorningArtifact(checkout, aiProvider, settings);
      setPhase(outcome.usedFallback ? "fallback" : "done");
    } catch (error) {
      // generateMorningArtifact fängt intern alles – dies ist eine letzte Sicherung.
      setNotice(friendlyMessageFor(toAiError(error).code));
      setPhase("fallback");
    }
  };

  if (phase === "generating") {
    return (
      <Page>
        <div className="stack-loose" style={{ marginTop: "24vh", textAlign: "center" }}>
          <p className="page-subtitle" data-testid="generation-status">
            Dein Morgenbild wird vorbereitet.
          </p>
        </div>
      </Page>
    );
  }

  if (phase === "done" || phase === "fallback") {
    return (
      <Page>
        <div className="stack-loose" style={{ marginTop: "24vh", textAlign: "center" }}>
          <p className="page-subtitle" data-testid="generation-status">
            {phase === "done"
              ? "Für morgen ist etwas entstanden."
              : "Dein Checkout ist gespeichert. Das Morgenbild wurde diesmal lokal gestaltet."}
          </p>
          <div>
            <Button variant="primary" onClick={() => navigate("home")} data-testid="back-home">
              Zurück
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Abend-Checkout">
      <div className="stack">
        <TextArea
          label="Wann warst du heute wirklich bei dir?"
          value={momentWithSelf}
          onChange={(event) => setMomentWithSelf(event.target.value)}
          data-testid="moment-with-self"
        />
        <TextArea
          label="Wo hast du dich heute verlassen?"
          value={momentOfLeavingSelf}
          onChange={(event) => setMomentOfLeavingSelf(event.target.value)}
          data-testid="moment-of-leaving-self"
        />
        <TextArea
          label="Was hat dir gutgetan?"
          value={whatHelped}
          onChange={(event) => setWhatHelped(event.target.value)}
          data-testid="what-helped"
        />
        <TextArea
          label="Was hat dir gefehlt?"
          value={whatWasMissing}
          onChange={(event) => setWhatWasMissing(event.target.value)}
          data-testid="what-was-missing"
        />
      </div>

      <div className="stack">
        <p className="field-label">Wie war dieser Abend für dich?</p>
        <ChoiceChips
          options={EVENING_STATES}
          labels={EVENING_STATE_LABELS}
          value={state}
          onChange={setState}
          ariaLabel="Abendzustand"
        />
      </div>

      <div className="stack">
        <p className="field-label">Wie deutlich war dieser Zustand?</p>
        <div className="choice-chips" role="group" aria-label="Wie deutlich war dieser Zustand?">
          {INTENSITIES.map((value) => (
            <button
              key={value}
              type="button"
              className="choice-chip"
              aria-pressed={intensity === value}
              onClick={() => setIntensity(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {!keyConfigured && aiProvider.kind !== "unavailable" && (
        <p className="muted small" data-testid="missing-key-hint">
          Ohne eingerichteten OpenAI-Zugang wird das Morgenbild lokal gestaltet. Du kannst den
          Zugang in den Einstellungen einrichten.
        </p>
      )}

      {notice && <ErrorNotice message={notice} />}

      <div className="row" style={{ justifyContent: "space-between" }}>
        <Button variant="quiet" onClick={() => navigate("home")}>
          Abbrechen
        </Button>
        <Button
          variant="primary"
          onClick={save}
          disabled={!canSave}
          data-testid="save-checkout"
        >
          Abschließen
        </Button>
      </div>
    </Page>
  );
}
