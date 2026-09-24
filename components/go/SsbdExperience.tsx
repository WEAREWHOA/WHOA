"use client";

import Link from "next/link";
import ElementBoxes from "@/components/go/ElementBoxes";
import StampControl from "@/components/go/StampControl";
import { STAMPS_TO_COMPLETE, type CardState } from "@/lib/scavenger";

/**
 * Through the door: the four elements, immediately.
 *
 * No intro and no chrome on purpose. The portal belongs on the way in
 * (see GoGate) — once someone is through it, anything between them and
 * the four doors is just a delay.
 *
 * The one thing above the doors is the stamp, and only while there's one
 * to take. This is the page the stickers point at, so someone who just
 * scanned one shouldn't have to go looking for the card to record it; a
 * filled card takes the strip away again.
 */
export default function SsbdExperience({ card }: { card: CardState }) {
  return (
    <div className="go-root">
      <div className="go-stage">
        {!card.complete && (
          <div className="scav-strip">
            <Link href="/go/scavenger" className="scav-strip-link">
              Scavenger card · {card.count} / {STAMPS_TO_COMPLETE}
            </Link>
            <StampControl card={card} variant="banner" />
          </div>
        )}

        <ElementBoxes />
      </div>
    </div>
  );
}
