"use client";

import { useEffect } from "react";
import type { EventInfo } from "@/lib/events";

// Required before checkout for any event at the WHOAdega/SH!FT Gallery —
// see lib/events.ts's requiresDamageWaiver. The legal text below is
// verbatim as supplied by WHOA; only the numbered-list markup is
// reformatted for display, no wording is altered. Agreement is re-checked
// server-side in eventRsvpAction — this modal is the UI gate, not the
// enforcement.
export default function DamageWaiverModal({
  event,
  onAgree,
  onClose,
}: {
  event: EventInfo;
  onAgree: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div aria-hidden className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="card-surface relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-lg text-muted hover:text-foreground"
        >
          ×
        </button>

        <div className="overflow-y-auto p-6 sm:p-8">
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            Required before checkout — {event.title}
          </span>
          <h2 className="font-display mt-2 text-2xl tracking-wide">Welcome To SH!FT Gallery</h2>

          <div className="mt-5 flex flex-col gap-4 text-sm leading-relaxed text-foreground">
            <section>
              <h3 className="font-semibold">1. Acknowledgment of Artwork Value</h3>
              <p className="mt-1 text-muted">
                I understand that all artwork, installations, and display items within the gallery are valuable and
                may be one-of-a-kind or irreplaceable. I agree to handle myself and any belongings (bags, children,
                pets, etc.) responsibly to avoid accidental contact or damage.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">2. Liability for Damage</h3>
              <p className="mt-1 text-muted">
                I agree that if I, intentionally or unintentionally, damage or destroy any artwork, installation, or
                property belonging to the gallery or participating artists, I am financially responsible for:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>Full repair costs, if repair is possible, or</li>
                <li>Full replacement cost or current appraised value of the piece, if repair is not possible.</li>
              </ul>
              <p className="mt-2 text-muted">
                I understand that the total amount owed will be determined by the gallery based on artist pricing,
                appraisal, or professional repair estimates.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">3. Conduct Expectations</h3>
              <p className="mt-1 text-muted">
                I agree to follow all posted rules and verbal instructions provided by staff. I will not touch
                artwork unless explicitly allowed and will maintain a safe distance from all pieces.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">4. Payment &amp; Collection</h3>
              <p className="mt-1 text-muted">
                If damage occurs, I agree to pay all costs before leaving the gallery. I understand unpaid balances
                may be pursued through collections or legal action. The entire gallery is equipped with cameras and
                footage may used as evidence in the court of law.
              </p>
            </section>

            <section>
              <h3 className="font-semibold">5. Purchasing Art</h3>
              <p className="mt-1 text-muted">By signing below, I acknowledge and agree that:</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                <li>I personally selected the artwork described above.</li>
                <li>I am voluntarily purchasing this artwork of my own free will.</li>
                <li>I personally authorized the payment used for this purchase.</li>
                <li>The contact information provided by me is accurate.</li>
                <li>I have had an opportunity to inspect the artwork and ask questions before completing my purchase.</li>
                <li>I understand there are no returns, exchanges, or refunds. All sales are final.</li>
                <li>If art is to be shipped, I agree to pay all shipping fees before the gallery sends it out.</li>
              </ol>
            </section>
          </div>
        </div>

        <div className="border-t border-border-strong bg-surface p-6 sm:px-8">
          <button type="button" onClick={onAgree} className="btn-flame w-full rounded-full px-8 py-4 text-base">
            Agree
          </button>
        </div>
      </div>
    </div>
  );
}
