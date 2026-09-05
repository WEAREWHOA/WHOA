"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { unlockPos, usePosUnlocked } from "@/components/pos/usePosAuth";

// Showcase-grade PIN, not real security — good enough to keep the register
// off the open web without needing full staff-account infrastructure yet.
const POS_PIN = "2222";
const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export default function PosPinGate({ children }: { children: ReactNode }) {
  const unlocked = usePosUnlocked();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleKey(key: string) {
    setError(false);
    if (key === "clear") {
      setPin("");
      return;
    }
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      if (next === POS_PIN) {
        unlockPos();
      } else {
        setError(true);
        setTimeout(() => setPin(""), 400);
      }
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-4">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back to site
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-xs flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">Staff only</span>
        <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide">WHOA POS</h1>
        <p className="mt-3 text-sm text-muted">Enter the register PIN to open the till.</p>

        <div className="mt-8 flex gap-3" aria-hidden>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? error
                    ? "border-flame-3 bg-flame-3"
                    : "border-flame-2 bg-flame-2"
                  : "border-border-strong"
              }`}
            />
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-flame-3">Wrong PIN — try again.</p>}

        <div className="mt-8 grid grid-cols-3 gap-3">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKey(key)}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold transition-colors ${
                key === "clear" || key === "back"
                  ? "border border-border-strong text-xs tracking-wide text-muted uppercase hover:text-foreground"
                  : "card-surface hover:border-flame-2/50"
              }`}
            >
              {key === "clear" ? "Clear" : key === "back" ? "⌫" : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
