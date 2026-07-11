import { useEffect, useMemo, useRef } from "react";
import type { AnimationSpec } from "../domain/animation-spec";
import { buildScene, renderFrame } from "./renderer";

interface MorningAnimationProps {
  spec: AnimationSpec;
  reducedMotion: boolean;
  onSettled: () => void;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Rendert das Morgenartefakt auf ein einzelnes Canvas.
 * Bei Reduced Motion wird ohne Bewegungsphase direkt das ruhige
 * Endbild gezeichnet und onSettled sofort aufgerufen (Satz < 250 ms).
 */
export function MorningAnimation({ spec, reducedMotion, onSettled }: MorningAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  });

  const scene = useMemo(() => buildScene(spec), [spec]);
  const skipMotion = reducedMotion || prefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onSettledRef.current();
      return;
    }

    let frameId = 0;
    let settled = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const logicalSize = () => {
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };

    resize();

    if (skipMotion) {
      const { width, height } = logicalSize();
      renderFrame(ctx, scene, 1, width, height);
      settled = true;
      onSettledRef.current();
    } else {
      let start: number | null = null;
      const tick = (timestamp: number) => {
        if (start === null) {
          start = timestamp;
        }
        const t = Math.min(1, (timestamp - start) / scene.spec.durationMs);
        const { width, height } = logicalSize();
        renderFrame(ctx, scene, t, width, height);
        if (t < 1) {
          frameId = requestAnimationFrame(tick);
        } else if (!settled) {
          settled = true;
          onSettledRef.current();
        }
      };
      frameId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      resize();
      if (settled) {
        const { width, height } = logicalSize();
        renderFrame(ctx, scene, 1, width, height);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [scene, skipMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="morning-canvas"
      role="img"
      aria-label="Abstraktes Morgenbild"
      data-testid="morning-canvas"
      data-reduced-motion={skipMotion ? "true" : "false"}
    />
  );
}
