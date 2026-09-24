"use client";

import Link from "next/link";
import { SCAVENGER_SLOTS, STAMPS_TO_COMPLETE, type StampOutcome } from "@/lib/scavenger";

/**
 * The card itself: six squares, stamped as stickers are found.
 *
 * The square that was just stamped is called out rather than left for the
 * eye to spot — someone scanning in a crowd gets one glance at their
 * phone, and "which one changed" shouldn't be a puzzle.
 */
export default function ScavengerCard({
  stamped,
  justStamped,
  outcome,
}: {
  stamped: string[];
  /** The slot id stamped by the scan that brought them here, if any. */
  justStamped?: string;
  outcome?: StampOutcome;
}) {
  const found = new Set(stamped);
  const complete = found.size >= STAMPS_TO_COMPLETE;

  return (
    <div className="scav-root">
      <header className="go-header">
        <Link href="/go" className="font-display text-lg tracking-[0.2em]">
          ← SSBD
        </Link>
        <span className="go-exit">
          {found.size} / {STAMPS_TO_COMPLETE}
        </span>
      </header>

      <section className="scav-head">
        <p className="go-eyebrow">Creation Station</p>
        <h1 className="font-display scav-title">THE SCAVENGER</h1>
        <p className="scav-sub">
          Six stickers are hidden around Creation Station. Scan any six different ones to fill your
          card — it doesn&apos;t matter which.
        </p>

        {outcome === "stamped" && (
          <p className="scav-flash scav-flash-good">Stamped. {STAMPS_TO_COMPLETE - found.size} to go.</p>
        )}
        {outcome === "already-had-it" && (
          <p className="scav-flash">You&apos;ve already got that one — find a different sticker.</p>
        )}
        {outcome === "unknown-code" && (
          <p className="scav-flash">That code isn&apos;t part of the hunt.</p>
        )}
        {outcome === "failed" && (
          <p className="scav-flash scav-flash-bad">
            We couldn&apos;t save that scan — try scanning again in a moment.
          </p>
        )}
      </section>

      <div className="scav-card">
        {SCAVENGER_SLOTS.map((slot, i) => {
          const got = found.has(slot.id);
          const fresh = justStamped === slot.id;
          return (
            <div
              key={slot.id}
              className={`scav-slot ${got ? "scav-slot-on" : ""} ${fresh ? "scav-slot-fresh" : ""}`}
            >
              {got ? (
                <>
                  <span className="scav-stamp">{slot.label}</span>
                  <span className="scav-slot-tick">✓</span>
                </>
              ) : (
                <span className="scav-slot-num">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {complete ? (
        <div className="scav-done">
          <p className="go-eyebrow">Card complete</p>
          <h2 className="font-display scav-done-title">ALL SIX FOUND</h2>
          <p className="scav-sub">
            Show this screen at Creation Station. Your card is saved to your WHOA account, so it
            stays filled if you close this.
          </p>
        </div>
      ) : (
        <p className="scav-hint">
          Keep scanning. Every sticker is a different square — the same one won&apos;t stamp twice.
        </p>
      )}
    </div>
  );
}
