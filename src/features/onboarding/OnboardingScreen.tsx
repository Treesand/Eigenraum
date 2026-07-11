import { useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { ErrorNotice } from "../../components/ErrorNotice";
import { useAppState } from "../../app/app-state";
import { toAiError, friendlyMessageFor } from "../../ai/errors";

export function OnboardingScreen() {
  const { navigate, updateSettings, aiProvider, keyConfigured, refreshKeyConfigured } =
    useAppState();
  const [step, setStep] = useState(0);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);

  const finish = async () => {
    await updateSettings({ onboardingCompleted: true });
    navigate("home");
  };

  const setupKey = async () => {
    setKeyMessage(null);
    try {
      const result = await aiProvider.configureKey();
      await refreshKeyConfigured();
      if (result.saved) {
        setKeyMessage("Der Zugang wurde gespeichert.");
      }
    } catch (error) {
      setKeyMessage(friendlyMessageFor(toAiError(error).code));
    }
  };

  return (
    <Page>
      {step === 0 && (
        <div className="stack-loose" style={{ marginTop: "18vh", textAlign: "center" }}>
          <h1 className="page-title" style={{ fontSize: "1.8rem" }}>
            Eigenraum
          </h1>
          <p className="page-subtitle">
            Ein kurzer Ort für morgens und abends.
            <br />
            Ohne Aufgaben, Punkte und Selbstoptimierung.
          </p>
        </div>
      )}

      {step === 1 && (
        <div className="stack-loose" style={{ marginTop: "18vh", textAlign: "center" }}>
          <p className="page-subtitle">
            Deine Einträge bleiben auf diesem Gerät.
            <br />
            Für das Morgenbild wird dein Abend-Checkout
            <br />
            mit deinem eigenen OpenAI-Zugang verarbeitet.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="stack-loose" style={{ marginTop: "14vh", textAlign: "center" }}>
          <div className="stack">
            <Button variant="primary" onClick={setupKey} data-testid="setup-openai-key">
              OpenAI-Zugang einrichten
            </Button>
            <p className="muted small">
              Der Schlüssel wird im geschützten Speicher
              <br />
              dieses Geräts abgelegt und nicht angezeigt.
            </p>
          </div>
          {keyMessage && <ErrorNotice message={keyMessage} />}
          {keyConfigured && <p className="muted small">Zugang eingerichtet.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="stack-loose" style={{ marginTop: "18vh", textAlign: "center" }}>
          <p className="page-subtitle">
            Du musst hier nichts leisten.
            <br />
            Du sollst nur etwas früher bemerken, wo du bist.
          </p>
        </div>
      )}

      <div className="spacer" />

      <div className="row" style={{ justifyContent: "space-between" }}>
        {step > 0 ? (
          <Button variant="quiet" onClick={() => setStep(step - 1)}>
            Zurück
          </Button>
        ) : (
          <span />
        )}
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} data-testid="onboarding-next">
            Weiter
          </Button>
        ) : (
          <Button variant="primary" onClick={finish} data-testid="onboarding-finish">
            Beginnen
          </Button>
        )}
      </div>
    </Page>
  );
}
