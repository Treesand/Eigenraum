import { useEffect, useState } from "react";
import type { MorningArtifact } from "../../domain/morning-artifact";
import { MorningAnimation } from "../../animation/MorningAnimation";

interface MorningArtifactViewProps {
  artifact: MorningArtifact;
  reducedMotion: boolean;
}

/**
 * Bühne des Morgenartefakts: erst die Canvas-Animation,
 * nach dem Beruhigen wird der Satz eingeblendet.
 * Bei Reduced Motion erscheint der Satz nach höchstens 250 ms.
 */
export function MorningArtifactView({ artifact, reducedMotion }: MorningArtifactViewProps) {
  const [settled, setSettled] = useState(false);
  const [phraseVisible, setPhraseVisible] = useState(false);

  // Reset zur Renderzeit statt per Effekt: MorningAnimation meldet
  // onSettled bei Reduced Motion synchron im eigenen Mount-Effekt,
  // ein nachlaufender Reset-Effekt würde diesen Zustand verlieren.
  const [lastArtifactId, setLastArtifactId] = useState(artifact.id);
  if (lastArtifactId !== artifact.id) {
    setLastArtifactId(artifact.id);
    setSettled(false);
    setPhraseVisible(false);
  }

  useEffect(() => {
    if (!settled) {
      return;
    }
    const timer = window.setTimeout(() => setPhraseVisible(true), reducedMotion ? 50 : 250);
    return () => window.clearTimeout(timer);
  }, [settled, reducedMotion]);

  return (
    <div className="morning-stage" data-testid="morning-artifact" data-status={artifact.status}>
      <MorningAnimation
        spec={artifact.animation}
        reducedMotion={reducedMotion}
        onSettled={() => setSettled(true)}
      />
      <p
        className={phraseVisible ? "morning-phrase visible" : "morning-phrase"}
        data-testid="morning-phrase"
        aria-live="polite"
      >
        {artifact.phrase}
      </p>
    </div>
  );
}
