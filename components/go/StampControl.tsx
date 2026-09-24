"use client";

import { useState, useSyncExternalStore } from "react";
import { stampAction } from "@/app/go/actions";
import { STAMPS_TO_COMPLETE, type CardState, type StampResult } from "@/lib/scavenger";

/**
 * The stamp itself: one button, plus the countdown to the next one.
 *
 * A shared ticking store rather than a timer per component, so the /go
 * banner and the card agree to the second, and so getSnapshot returns a
 * stable value between ticks — React re-reads it on every render and
 * complains about a snapshot that changes underneath it.
 */
let currentSecond = Math.floor(Date.now() / 1000);
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function subscribeToClock(onChange: () => void) {
  listeners.add(onChange);
  if (!ticker) {
    ticker = setInterval(() => {
      const second = Math.floor(Date.now() / 1000);
      if (second === currentSecond) return;
      currentSecond = second;
      for (const listener of listeners) listener();
    }, 500);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}

function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function StampControl({
  card,
  variant,
}: {
  card: CardState;
  variant: "banner" | "card";
}) {
  const [result, setResult] = useState<StampResult | null>(null);
  const [busy, setBusy] = useState(false);

  // The action hands back fresh state, so the button updates the moment
  // it's tapped rather than waiting for the page to come back.
  const state = result?.state ?? card;

  // card.asOfSecond, not the post-stamp state's: this is the value the
  // server rendered with, and hydration has to match it exactly.
  const second = useSyncExternalStore(
    subscribeToClock,
    () => currentSecond,
    () => card.asOfSecond,
  );

  const remaining = state.nextStampAt ? state.nextStampAt - second * 1000 : 0;
  const waiting = remaining > 0;

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

  const label = busy
    ? "Stamping…"
    : waiting
      ? `Next stamp in ${countdown(remaining)}`
      : "I found a sticker";

  return (
    <div className={variant === "banner" ? "scav-bar" : "scav-take"}>
      <button
        type="button"
        onClick={takeStamp}
        disabled={busy || waiting}
        className="scav-btn"
      >
        {label}
      </button>

      <p className="scav-bar-note" aria-live="polite">
        {result?.outcome === "stamped" &&
          `Stamped. ${STAMPS_TO_COMPLETE - state.count} to go.`}
        {result?.outcome === "cooling-down" && "Not yet — go find another sticker first."}
        {result?.outcome === "signed-out" && "Your session ended. Reload and sign in to stamp."}
        {result?.outcome === "failed" && "We couldn't save that. Try again in a moment."}
        {!result && waiting && "Go find the next sticker while this runs down."}
        {!result && !waiting && `${state.count} of ${STAMPS_TO_COMPLETE} stamped.`}
      </p>
    </div>
  );
}
