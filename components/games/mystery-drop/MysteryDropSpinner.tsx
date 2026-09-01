"use client";

import { useRef, useState } from "react";
import { MYSTERY_DROPS, pullMysteryDrop, type MysteryDrop } from "@/lib/games/mysteryDrops";

const SPIN_DURATION_MS = 1800;

export default function MysteryDropSpinner() {
  const [spinning, setSpinning] = useState(false);
  const [displayed, setDisplayed] = useState<MysteryDrop>(MYSTERY_DROPS[0]);
  const [result, setResult] = useState<MysteryDrop | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    const startedAt = Date.now();

    function shuffle() {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= SPIN_DURATION_MS) {
        const final = pullMysteryDrop();
        setDisplayed(final);
        setResult(final);
        setSpinning(false);
        return;
      }

      setDisplayed(MYSTERY_DROPS[Math.floor(Math.random() * MYSTERY_DROPS.length)]);

      // Ease the interval out so it visibly slows down before landing.
      const progress = elapsed / SPIN_DURATION_MS;
      const delay = 60 + progress * 220;
      timeoutsRef.current.push(setTimeout(shuffle, delay));
    }

    shuffle();
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-56 w-56 flex-col items-center justify-center rounded-3xl border-2 p-6 text-center transition-colors"
        style={{ borderColor: displayed.accent }}
      >
        <span
          className={`text-6xl ${spinning ? "animate-pulse" : ""}`}
          style={{ filter: `drop-shadow(0 0 12px ${displayed.accent})` }}
          aria-hidden
        >
          🎁
        </span>
        <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
          {spinning ? "Spinning…" : result ? displayed.rarity : "Ready"}
        </p>
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="btn-flame mt-6 rounded-full px-8 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {spinning ? "Spinning…" : result ? "Spin again" : "Pull a mystery drop"}
      </button>

      {result && (
        <div
          className="card-surface mt-8 w-full max-w-sm rounded-2xl border p-6 text-center"
          style={{ borderColor: result.accent }}
        >
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: result.accent }}>
            {result.rarity}
          </p>
          <h3 className="font-display mt-2 text-2xl tracking-wide">{result.name}</h3>
          <p className="mt-2 text-sm text-muted">{result.description}</p>
          <p className="mt-4 text-xs text-muted">Show this screen at the booth to claim it.</p>
        </div>
      )}
    </div>
  );
}
