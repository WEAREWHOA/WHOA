"use client";

import { useEffect, useRef, useState } from "react";
import { stampAction } from "@/app/go/actions";
import { STAMPS_TO_COMPLETE, type CardState, type StampResult } from "@/lib/scavenger";

/**
 * Stamps the card on arrival. Scanning a flyer is the whole action — no
 * button, nothing to tap once the page is open.
 *
 * Fired from the browser rather than during the server render, for two
 * reasons. A page render isn't allowed to have side effects and runs
 * again on every navigation into the route, and Next prefetches links on
 * hover — a server-side stamp would hand out squares for pages nobody
 * ever opened. An effect only runs when a page is actually on screen.
 *
 * Once per page load, guarded by a ref so React's development double-run
 * doesn't double-stamp. A refresh or a back-button return is a new load
 * and stamps again, which is the accepted trade for having no button:
 * rescanning a flyer has to work, and the two are indistinguishable.
 */
export default function AutoStamp({ card }: { card: CardState }) {
  const [result, setResult] = useState<StampResult | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || card.complete) return;
    fired.current = true;
    stampAction()
      .then(setResult)
      .catch(() => setResult({ outcome: "failed", state: card }));
  }, [card]);

  const state = result?.state ?? card;

  const note = card.complete
    ? "Card full — all six found."
    : !result
      ? "Stamping…"
      : result.outcome === "stamped"
        ? state.complete
          ? "Stamped — that's all six."
          : `Stamped — ${state.count} of ${STAMPS_TO_COMPLETE}.`
        : result.outcome === "complete"
          ? "Card full — all six found."
          : result.outcome === "signed-out"
            ? "Your session ended. Reload to stamp this one."
            : "We couldn't save that scan. Reload to try again.";

  return (
    <p className="scav-bar-note" aria-live="polite">
      {note}
    </p>
  );
}
