"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Portal from "@/components/go/Portal";
import ElementBoxes from "@/components/go/ElementBoxes";

const PORTAL_HOLD_MS = 1100;
const TRAVEL_MS = 1200;

/**
 * Through the door: the portal opens, then the four elements.
 *
 * Short and skippable. Someone scanning a code at a festival wants to be
 * somewhere, not watch an intro — so a tap anywhere cuts straight to the
 * boxes, and anyone whose device asks for reduced motion never sees the
 * tunnel at all.
 */
export default function SsbdExperience({ name }: { name?: string }) {
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    // Zero-length timers rather than an early setState, so the server and
    // the first client render still agree on what's on screen.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const timer = window.setTimeout(
      () => setArrived(true),
      reduced ? 0 : PORTAL_HOLD_MS + TRAVEL_MS,
    );
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="go-root" onClick={() => setArrived(true)}>
      {!arrived && <Portal opening />}

      {!arrived && (
        <div className="go-intro">
          <p className="go-eyebrow">You&apos;re through</p>
          <h1 className="font-display go-title">THE SSBD EXPERIENCE</h1>
          <p className="go-skip">Tap to skip</p>
        </div>
      )}

      <div className={`go-stage ${arrived ? "go-stage-in" : ""}`}>
        <header className="go-header">
          <span className="font-display text-lg tracking-[0.2em]">SSBD</span>
          <Link href="/" className="go-exit">
            ← wearewhoa.art
          </Link>
        </header>

        <div className="go-welcome">
          <p className="go-eyebrow">{name ? `Welcome, ${name}` : "You're through"}</p>
          <h2 className="font-display go-welcome-title">PICK YOUR ELEMENT</h2>
          <p className="go-welcome-sub">Four doors. Each one opens on something real.</p>
        </div>

        <ElementBoxes />
      </div>
    </div>
  );
}
