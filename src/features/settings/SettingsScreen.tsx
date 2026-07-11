import { useState } from "react";
import { Page } from "../../components/Page";
import { Button } from "../../components/Button";
import { ErrorNotice } from "../../components/ErrorNotice";
import { useAppState } from "../../app/app-state";
import { Select } from "../../components/Select";
import { exportAllData, deleteAllData } from "../../storage/export";
import { friendlyMessageFor, toAiError } from "../../ai/errors";
import {
  AI_MODELS,
  REASONING_EFFORTS,
  isKnownAiModel,
  type ReasoningEffort,
} from "../../ai/prompt-builder";
import { APP_VERSION } from "../../app/version";

export function SettingsScreen() {
  const {
    navigate,
    settings,
    updateSettings,
    aiProvider,
    keyConfigured,
    refreshKeyConfigured,
  } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const testConnection = async () => {
    setNotice(null);
    try {
      const result = await aiProvider.testConnection();
      if (result.valid && result.modelAccess) {
        setNotice("Der Zugang funktioniert.");
      } else if (result.valid) {
        setNotice("Der Zugang funktioniert, das Modell ist aber nicht verfügbar.");
      } else {
        setNotice("Der Zugang wurde nicht akzeptiert.");
      }
    } catch (error) {
      setNotice(friendlyMessageFor(toAiError(error).code));
    }
  };

  const replaceKey = async () => {
    setNotice(null);
    try {
      const result = await aiProvider.configureKey();
      await refreshKeyConfigured();
      setNotice(result.saved ? "Der Zugang wurde gespeichert." : "Es wurde nichts geändert.");
    } catch (error) {
      setNotice(friendlyMessageFor(toAiError(error).code));
    }
  };

  const deleteKey = async () => {
    setNotice(null);
    await aiProvider.deleteKey();
    await refreshKeyConfigured();
    setNotice("Der Zugang wurde entfernt.");
  };

  const exportJson = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `eigenraum-export-${data.exportedAt.slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const wipeAll = async () => {
    await deleteAllData();
    setConfirmDelete(false);
    setNotice("Alle lokalen Daten wurden gelöscht.");
  };

  return (
    <Page title="Einstellungen">
      <section className="surface stack">
        <h2 className="page-subtitle">OpenAI-Zugang</h2>
        <p className="muted small">
          {keyConfigured ? "Ein Zugang ist eingerichtet." : "Kein Zugang eingerichtet."}
        </p>
        <div className="row">
          <Button onClick={testConnection}>Zugang prüfen</Button>
          <Button onClick={replaceKey} data-testid="replace-key">
            {keyConfigured ? "Zugang ersetzen" : "Zugang einrichten"}
          </Button>
          {keyConfigured && (
            <Button variant="danger" onClick={deleteKey}>
              Zugang löschen
            </Button>
          )}
        </div>
      </section>

      <section className="surface stack">
        <h2 className="page-subtitle">Morgenbild-Erzeugung</h2>
        <Select
          label="Modell"
          value={isKnownAiModel(settings.aiModel) ? settings.aiModel : AI_MODELS[0].id}
          options={AI_MODELS}
          onChange={(aiModel) => updateSettings({ aiModel })}
          testId="model-select"
        />
        <Select<ReasoningEffort>
          label="Nachdenken"
          value={settings.reasoningEffort}
          options={REASONING_EFFORTS}
          onChange={(reasoningEffort) => updateSettings({ reasoningEffort })}
          testId="reasoning-select"
        />
      </section>

      <section className="surface stack">
        <h2 className="page-subtitle">Darstellung</h2>
        <div className="settings-row">
          <label htmlFor="reduced-motion">Reduzierte Bewegung</label>
          <input
            id="reduced-motion"
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(event) => updateSettings({ reducedMotion: event.target.checked })}
          />
        </div>
      </section>

      <section className="surface stack">
        <h2 className="page-subtitle">Kontext für das Morgenbild</h2>
        <p className="muted small">
          Wie viele vergangene Abende dürfen in die Gestaltung einfließen?
        </p>
        <div className="choice-chips" role="group" aria-label="Kontextumfang">
          {([0, 1, 3] as const).map((depth) => (
            <button
              key={depth}
              type="button"
              className="choice-chip"
              aria-pressed={settings.contextDepth === depth}
              onClick={() => updateSettings({ contextDepth: depth })}
            >
              {depth === 0 ? "Keine" : depth === 1 ? "1 Tag" : "3 Tage"}
            </button>
          ))}
        </div>
      </section>

      <section className="surface stack">
        <h2 className="page-subtitle">Daten</h2>
        <p className="muted small">
          Deine Einträge werden lokal gespeichert. Für die Erzeugung eines Morgenbildes wird der
          dafür benötigte Checkout direkt von deinem Gerät an OpenAI gesendet.
        </p>
        <div className="row">
          <Button onClick={exportJson}>Als JSON exportieren</Button>
          {!confirmDelete ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              Alle Daten löschen
            </Button>
          ) : (
            <>
              <Button variant="danger" onClick={wipeAll} data-testid="confirm-delete-all">
                Wirklich alles löschen
              </Button>
              <Button variant="quiet" onClick={() => setConfirmDelete(false)}>
                Behalten
              </Button>
            </>
          )}
        </div>
      </section>

      {notice && <ErrorNotice message={notice} />}

      <p className="muted small" style={{ textAlign: "center" }}>
        Eigenraum {APP_VERSION}
      </p>

      <div className="row">
        <Button variant="quiet" onClick={() => navigate("home")}>
          Zurück
        </Button>
      </div>
    </Page>
  );
}
