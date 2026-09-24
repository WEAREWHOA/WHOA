"use client";

import { useState } from "react";
import { stampAction } from "@/app/go/actions";
import { STAMPS_TO_COMPLETE, type CardState, type StampResult } from "@/lib/scavenger";

/**
 * The stamp: one tap, no waiting.
 *
 * It goes quiet after a stamp until the page is loaded again, which is
 * what keeps "scan six flyers" from collapsing into six taps on one
 * screen. Rescanning any flyer — even the one they're standing at —
 * reloads the page and arms it again, so it never blocks anyone who is
 * actually walking around scanning.
 */
export default function StampControl({
  card,
  variant,
}: {
  card: CardState;
  variant: "banner" | "card";
}) {
  const [result, setResult] = useState<StampResult | null>(null);
  const [busy, setBusy] = useState(false);

  // The action hands back fresh state, so the card updates the moment
  // it's tapped rather than waiting for the page to come back.
  const state = result?.state ?? card;
  const spent = result?.outcome === "stamped";

  function takeStamp() {
    setBusy(true);
    stampAction()
      .then((next) => {
        setResult(next);
        setBusy(false);
      })
      .catch(() => {
        setResult({ outcome: "failed", state });
        setBusy(false);
      });
  }

  if (state.complete) return null;

  const label = busy ? "Stamping…" : spent ? "Scan the next flyer" : "Stamp my card";

  return (
    <div className={variant === "banner" ? "scav-bar" : "scav-take"}>
      <button type="button" onClick={takeStamp} disabled={busy || spent} className="scav-btn">
        {label}
      </button>

      <p className="scav-bar-note" aria-live="polite">
        {result?.outcome === "stamped" &&
          (state.complete
            ? "That's all six."
            : `Stamped — ${state.count} of ${STAMPS_TO_COMPLETE}. Go find the next flyer.`)}
        {result?.outcome === "complete" && "Your card is already full."}
        {result?.outcome === "signed-out" && "Your session ended. Reload and sign in to stamp."}
        {result?.outcome === "failed" && "We couldn't save that. Try again in a moment."}
        {!result && `${state.count} of ${STAMPS_TO_COMPLETE} stamped.`}
      </p>
    </div>
  );
}
