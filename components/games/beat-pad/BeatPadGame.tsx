"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PADS, playSound } from "@/lib/games/beatPad";

const KEY_MAP = ["1", "2", "3", "4", "q", "w", "e", "r", "a", "s", "d", "f", "z", "x", "c", "v"];

export default function BeatPadGame() {
  const [activePad, setActivePad] = useState<string | null>(null);

  function hit(padId: string) {
    const pad = PADS.find((p) => p.id === padId);
    if (!pad) return;
    playSound(pad.sound);
    setActivePad(padId);
    setTimeout(() => setActivePad((current) => (current === padId ? null : current)), 120);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const index = KEY_MAP.indexOf(e.key.toLowerCase());
      if (index === -1) return;
      hit(PADS[index].id);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-4 gap-3">
        {PADS.map((pad, i) => (
          <button
            key={pad.id}
            type="button"
            onClick={() => hit(pad.id)}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-semibold transition-transform sm:h-24 sm:w-24"
            style={{
              borderColor: pad.accent,
              backgroundColor: activePad === pad.id ? `${pad.accent}55` : `${pad.accent}14`,
              transform: activePad === pad.id ? "scale(0.94)" : "scale(1)",
              color: pad.accent,
            }}
          >
            <span>{pad.label}</span>
            <span className="text-[0.6rem] text-muted uppercase">{KEY_MAP[i]}</span>
          </button>
        ))}
      </div>

      <p className="mt-6 max-w-sm text-center text-xs text-muted">
        Synth pads for now — real WHOA-branded sound drops in later. Tap, or use your keyboard
        (1234 / qwer / asdf / zxcv).
      </p>

      <Link href="/music-collective" className="text-flame-2 mt-4 text-xs font-semibold uppercase hover:underline">
        Hear the real thing → Music Collective
      </Link>
    </div>
  );
}
