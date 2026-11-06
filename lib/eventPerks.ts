import { isWhoaWednesday } from "./whoaWednesday";
import type { EventInfo } from "./events";

/**
 * What an RSVP is worth on the night.
 *
 * A free WHOA Wednesday inside the WHOADEGA gets two dollars off a
 * drink for anybody who RSVP'd beforehand. The point is the "ahead of
 * time": a door count is a guess until people have said they are
 * coming, and this is what makes saying so worth the thirty seconds.
 *
 * In one file because it has to be told identically in three places
 * that are nowhere near each other: the event card before they RSVP,
 * the confirmation email, and the portal on the night. Three copies of
 * a discount is how one of them ends up saying three dollars.
 */

export const DRINK_PERK_AMOUNT = "$2";

export const DRINK_PERK_LABEL = `${DRINK_PERK_AMOUNT} off a drink`;

/** Before they have one: the reason to bother. */
export const DRINK_PERK_TEASE = `RSVP ahead and get ${DRINK_PERK_AMOUNT} off any drink at the door.`;

/** Once they have one: how to use it. */
export const DRINK_PERK_REDEEM =
  `Show this at the bar for ${DRINK_PERK_AMOUNT} off any drink. ` +
  `This email or your WHOA portal both work.`;

/**
 * Whether this event carries the perk.
 *
 * Three conditions, and each one is doing work:
 *
 *   A WHOA Wednesday, matched on the title the same way the permalink
 *   does, so a themed one ("WHOA Wednesday — Clown Rave") still counts.
 *
 *   At the WHOADEGA and NOT the SH!FT Gallery. The gallery nights are
 *   the paid ones and are not part of this.
 *
 *   Free. A paid night already gave somebody a reason to commit, and
 *   discounting the bar on top of a ticket was never the offer.
 */
export function hasDrinkPerk(event: Pick<EventInfo, "title" | "venue" | "priceCents">): boolean {
  if (!isWhoaWednesday(event)) return false;
  if (event.priceCents && event.priceCents > 0) return false;

  const venue = event.venue;
  return /WHOAdega/i.test(venue) && !/SH!FT/i.test(venue);
}
