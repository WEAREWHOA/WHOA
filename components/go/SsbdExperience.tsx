"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Portal from "@/components/go/Portal";
import Village from "@/components/go/Village";

const PORTAL_HOLD_MS = 1500;
const TRAVEL_MS = 1400;

/**
 * Arrival: the portal opens, you travel through it, the village is on the
 * other side.
 *
 * The whole sequence is skippable and self-cancelling. Someone scanning a
 * code at a festival wants to be somewhere, not watch an intro — so it's
 * short, a tap anywhere cuts straight to the village, and anyone who has
 * asked their device for reduced motion never sees it at all.
 */
export default function SsbdExperience() {
  const [phase, setPhase] = useState<"portal" | "travelling" | "village">("portal");

  useEffect(() => {
    // Honour the OS setting rather than animating anyway: a spinning
    // tunnel is exactly the kind of thing reduced-motion is asking about.
    // Expressed as zero-length timers rather than an early setState so the
    // server and the first client render still agree on what's on screen.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const hold = reduced ? 0 : PORTAL_HOLD_MS;
    const travel = reduced ? 0 : TRAVEL_MS;

    const toTravel = window.setTimeout(() => setPhase("travelling"), hold);
    const toVillage = window.setTimeout(() => setPhase("village"), hold + travel);
    return () => {
      window.clearTimeout(toTravel);
      window.clearTimeout(toVillage);
    };
  }, []);

  const arrived = phase === "village";

  return (
    <div
      className="go-root"
      onClick={() => {
        if (!arrived) setPhase("village");
      }}
    >
      {!arrived && <Portal opening={phase === "travelling"} />}

      {!arrived && (
        <div className="go-intro">
          <p className="go-eyebrow">Same Same But Different</p>
          <h1 className="font-display go-title">THE SSBD EXPERIENCE</h1>
          <p className="go-skip">Tap to skip</p>
        </div>
      )}

      <Village entered={arrived} />

      {arrived && (
        <header className="go-header">
          <span className="font-display text-lg tracking-[0.2em]">SSBD</span>
          <Link href="/" className="go-exit">
            ← wearewhoa.art
          </Link>
        </header>
      )}

      {arrived && (
        <div className="go-welcome">
          <p className="go-eyebrow">You&apos;re through</p>
          <h2 className="font-display go-welcome-title">PICK A DIRECTION</h2>
          <p className="go-welcome-sub">Four places in the village. Tap one to go in.</p>
        </div>
      )}
    </div>
  );
}
