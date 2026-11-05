import { sortEventsByProximity, type EventInfo } from "./events";
import { getAllEvents } from "./eventsStore";
import { PERMANENT_LOCATIONS, type StoreLocation } from "./stores";
import { pacificToday } from "./pacificTime";

/**
 * The shop, as a page knows it.
 *
 * All of this is derived rather than written down a second time. The
 * address lives in lib/stores.ts because the store locator needs it,
 * and what is on lives in the events calendar because that is where
 * somebody adds an event. A second copy here would be a second thing to
 * update and the one that quietly goes stale, which on an address or a
 * date is the worst kind of wrong.
 */

/** The shop's own entry out of the locations list. */
export function whoadega(): StoreLocation {
  const found = PERMANENT_LOCATIONS.find((l) => l.slug === "whoadega");
  if (!found) throw new Error("The WHOADEGA is missing from PERMANENT_LOCATIONS");
  return found;
}

/**
 * Whether an event happens at the shop.
 *
 * Matched on the venue, the same test lib/events.ts uses to decide a
 * damage waiver, so a newly authored event is picked up by both without
 * anybody remembering to tick a box. The category is not the test:
 * SH!FT gallery shows are filed under "shows" and are very much here.
 */
export function isAtTheShop(event: Pick<EventInfo, "venue">): boolean {
  return /WHOAdega|SH!FT/i.test(event.venue);
}

export interface ShopEvents {
  upcoming: EventInfo[];
  /** The most recent nights, for when nothing is on the books yet. */
  past: EventInfo[];
}

/**
 * What is on at the shop, and what has been.
 *
 * Both, deliberately. A page about a venue with an empty "what's on"
 * reads as a venue that closed, and there is always a stretch where the
 * next month has not been announced. Showing the last few nights says
 * the opposite of nothing, and it is true either way.
 */
export async function shopEvents(now: Date = new Date()): Promise<ShopEvents> {
  const mine = (await getAllEvents()).filter(isAtTheShop);
  const today = pacificToday(now);

  const sorted = sortEventsByProximity(mine, now);
  const upcoming = sorted.filter((e) => (e.endDate ?? e.startDate) >= today);
  const past = sorted.filter((e) => (e.endDate ?? e.startDate) < today);

  return { upcoming: upcoming.slice(0, 6), past: past.slice(0, 6) };
}
