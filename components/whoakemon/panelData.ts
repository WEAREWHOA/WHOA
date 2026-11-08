import "server-only";

import { getCurrentPriceCents, isTicketingOpen, sortEventsByProximity } from "@/lib/events";
import { getAllEvents } from "@/lib/eventsStore";

import { loadCatalogue, type GameCatalogue } from "./shopData";

/**
 * The real data behind every counter.
 *
 * Each attendant hands over what their building actually holds: the
 * shop its catalogue, the Events Hall the real calendar. Both are
 * read here, on the server, and trimmed to what fits on a screen the
 * size of a playing card.
 *
 * The crew and card counters need nothing fetched. Their content is
 * tiers and perks, which already live in lib as plain constants, so
 * the panel imports them directly rather than having them copied
 * through here and going stale.
 */

export interface GameEvent {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  location: string;
  /** Null for a free RSVP. */
  priceCents: number | null;
  /** False once the doors have closed on it. */
  open: boolean;
  imageUrl: string | null;
  /** A couple of lines at most: the dialogue box is small. */
  details: string[];
  lineup: string[];
  /** Where to go to actually book. */
  href: string;
}

export interface GamePanels {
  catalogue: GameCatalogue;
  events: GameEvent[];
  eventsError: string | null;
}

export async function loadPanels(): Promise<GamePanels> {
  const catalogue = await loadCatalogue();

  let events: GameEvent[] = [];
  let eventsError: string | null = null;

  try {
    const all = await getAllEvents();
    const now = new Date();
    events = sortEventsByProximity(all, now)
      // Nearest first, and only the ones somebody can still turn up
      // to. A calendar of things that already happened is a museum.
      .filter((e) => isTicketingOpen(e, now))
      .slice(0, 24)
      .map((e) => {
        const cents = getCurrentPriceCents(e, now);
        return {
          id: e.id,
          title: e.title,
          dateLabel: e.dateLabel,
          timeLabel: e.timeLabel,
          venue: e.venue,
          location: e.location,
          priceCents: cents > 0 ? cents : null,
          open: true,
          imageUrl: e.imageUrl ?? null,
          details: (e.details ?? []).slice(0, 3),
          lineup: (e.lineup ?? []).slice(0, 6),
          // An event with its own external ticketing keeps linking
          // out; everything else books through this site.
          href: e.href ?? `/events#${e.id}`,
        };
      });
  } catch (err) {
    console.error("Couldn't load events for WHOAkémon:", err);
    eventsError = "The calendar is down. Try the website.";
  }

  return { catalogue, events, eventsError };
}
