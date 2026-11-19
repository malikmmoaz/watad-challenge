"use client";

import { useEffect, useState } from "react";
import { ScoreScale } from "@/components/ui";
import { useReducedMotion } from "../client-state";
import { common } from "@/i18n/common";
import { useMessages } from "@/i18n/locale";

const DURATION_MS = 1100;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * The score and band, revealed once when the checks have just run: the score
 * counts up and the marker travels through the bands to land on the result.
 * Static on later visits and with reduced motion. The final value is
 * announced once; the counting itself is hidden from screen readers.
 */
export function ScoreReveal({ score, animate }: { score: number; animate: boolean }) {
  const reduced = useReducedMotion();
  const ui = useMessages(common).ui;
  const play = animate && !reduced;
  const [shown, setShown] = useState(play ? 0 : score);

  useEffect(() => {
    if (!play) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setShown(Math.round(easeOut(t) * score * 10) / 10);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, score]);

  return (
    <div data-testid="credit-score-reveal" data-final={score}>
      <div aria-hidden={play && shown !== score ? true : undefined}>
        <ScoreScale score={play ? shown : score} />
      </div>
      <p className="sr-only" aria-live="polite">
        {ui.creditScore} {Math.round(score)} {ui.outOf100}.
      </p>
    </div>
  );
}
