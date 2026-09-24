"use client";

import Link from "next/link";
import ElementBoxes from "@/components/go/ElementBoxes";
import AutoStamp from "@/components/go/AutoStamp";
import { STAMPS_TO_COMPLETE, type CardState } from "@/lib/scavenger";

/**
 * Through the door: the four elements, immediately.
 *
 * No intro and no chrome on purpose. The portal belongs on the way in
 * (see GoGate) — once someone is through it, anything between them and
 * the four doors is just a delay.
 *
 * The one thing above the doors is the scavenger strip. This is the page
 * every flyer points at, so arriving here is the scan — the strip stamps
 * the card and says so, and links to the card for the full six.
 */
export default function SsbdExperience({ card }: { card: CardState }) {
  return (
    <div className="go-root">
      <div className="go-stage">
        <div className="scav-strip">
          <Link href="/go/scavenger" className="scav-strip-link">
            Scavenger card · {card.count} / {STAMPS_TO_COMPLETE}
          </Link>
          <AutoStamp card={card} />
        </div>

        <ElementBoxes />
      </div>
    </div>
  );
}
