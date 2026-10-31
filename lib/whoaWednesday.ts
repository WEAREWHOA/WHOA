import { getAllEvents } from "./eventsStore";
import { pacificToday } from "./pacificTime";
import type { EventInfo } from "./events";

/**
 * The one link that always points at the next WHOA Wednesday.
 *
 * A weekly night needs an address that outlives any one of its dates:
 * something to print on a flyer, put on the /go page and leave at the
 * top of the calendar, which still works next month. Linking to a
 * particular week's page means editing every one of those the morning
 * after, and forgetting to.
 */

/**
 * Whether this event is one of them.
 *
 * Matched on the title's opening words rather than an exact string,
 * because the themed ones are still WHOA Wednesdays: "WHOA Wednesday —
 * Clown Rave" and "WHOA Wednesday — Open Decks Contest" are nights
 * somebody looking for the next Wednesday wants to be sent to. The
 * category is not the test: whoadega covers every pop-up at the shop,
 * most of which are not this.
 */
export function isWhoaWednesday(event: Pick<EventInfo, "title">): boolean {
  return event.title.trim().toLowerCase().startsWith("whoa wednesday");
}

/**
 * The next one out of a list, or undefined if there isn't one.
 *
 * Split from the fetch so the choosing can be exercised on its own,
 * against dates that are not whatever today happens to be.
 *
 * Still counts today's, all day. The night runs to 11pm and somebody
 * opening the link at six o'clock on the day wants tonight, not next
 * week; it rolls over the following morning, which is the behaviour
 * asked for. That also means a date with no time of day is enough, so
 * nothing here has to know when doors are.
 */
export function pickNextWhoaWednesday<T extends Pick<EventInfo, "title" | "startDate" | "endDate">>(
  events: T[],
  now: Date = new Date(),
): T | undefined {
  const today = pacificToday(now);
  return events
    .filter((event) => isWhoaWednesday(event) && (event.endDate || event.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

/** The same thing, against the real calendar. */
export async function getNextWhoaWednesday(
  now: Date = new Date(),
): Promise<EventInfo | undefined> {
  return pickNextWhoaWednesday(await getAllEvents(), now);
}
