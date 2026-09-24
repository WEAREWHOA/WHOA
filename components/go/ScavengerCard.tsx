"use client";

import Link from "next/link";
import StampControl from "@/components/go/StampControl";
import { STAMPS_TO_COMPLETE, STAMP_LABELS, type CardState } from "@/lib/scavenger";

/**
 * The card itself: six squares, filled in order as stickers are found.
 *
 * In order, rather than one square per sticker, because every sticker
 * carries the same /go URL — the card can count what someone found, not
 * which ones. Numbering the squares after specific stickers would read as
 * a claim the page can't back up.
 */
export default function ScavengerCard({ card }: { card: CardState }) {
  return (
    <div className="scav-root">
      <header className="go-header">
        <Link href="/go" className="font-display text-lg tracking-[0.2em]">
          ← SSBD
        </Link>
        <span className="go-exit">
          {card.count} / {STAMPS_TO_COMPLETE}
        </span>
      </header>

      <section className="scav-head">
        <p className="go-eyebrow">Creation Station</p>
        <h1 className="font-display scav-title">THE SCAVENGER</h1>
        <p className="scav-sub">
          Six flyers are spread around Creation Station. Scan one, stamp your card, then go and
          find the next. It doesn&apos;t matter which six you find.
        </p>
      </section>

      <div className="scav-card">
        {STAMP_LABELS.map((label, i) => {
          const got = i < card.count;
          const fresh = i === card.count - 1;
          return (
            <div
              key={label}
              className={`scav-slot ${got ? "scav-slot-on" : ""} ${fresh ? "scav-slot-fresh" : ""}`}
            >
              {got ? (
                <>
                  <span className="scav-stamp">{label}</span>
                  <span className="scav-slot-tick">✓</span>
                </>
              ) : (
                <span className="scav-slot-num">{i + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {card.complete ? (
        <div className="scav-done">
          <p className="go-eyebrow">Card complete</p>
          <h2 className="font-display scav-done-title">ALL SIX FOUND</h2>
          <p className="scav-sub">
            Show this screen at Creation Station. Your card is saved to your WHOA account, so it
            stays filled if you close this.
          </p>
        </div>
      ) : (
        <>
          <StampControl card={card} variant="card" />
          <p className="scav-hint">
            One stamp per scan. Your card is saved to your WHOA account, so you can close this and
            come back to it.
          </p>
        </>
      )}
    </div>
  );
}
