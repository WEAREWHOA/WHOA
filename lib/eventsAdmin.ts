import { EVENTS, type EventInfo } from "./events";
import { getAllRsvps, type EventRsvpRecord } from "./eventRsvps";

export interface ArtistBreakdownEntry {
  artist: string;
  count: number;
}

export interface EventAdminSummary {
  event: EventInfo;
  rsvpCount: number;
  ticketCount: number;
  totalGuests: number;
  revenueCents: number;
  guests: EventRsvpRecord[];
  // Guests grouped by their optional "pick an artist" answer, most-picked
  // first. Guests with no preference aren't counted here.
  artistBreakdown: ArtistBreakdownEntry[];
}

export interface EventsAdminOverview {
  upcoming: EventAdminSummary[];
  past: EventAdminSummary[];
  totals: {
    totalGuests: number;
    totalRevenueCents: number;
    eventsWithGuests: number;
    topArtists: ArtistBreakdownEntry[];
  };
}

function buildArtistBreakdown(guests: EventRsvpRecord[]): ArtistBreakdownEntry[] {
  const counts = new Map<string, number>();
  for (const guest of guests) {
    if (!guest.selectedArtist) continue;
    counts.set(guest.selectedArtist, (counts.get(guest.selectedArtist) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count);
}

function summarizeEvent(event: EventInfo, guests: EventRsvpRecord[]): EventAdminSummary {
  const tickets = guests.filter((g) => g.priceCents > 0);
  const rsvps = guests.filter((g) => g.priceCents === 0);
  const revenueCents = tickets.reduce((sum, g) => sum + g.priceCents, 0);

  return {
    event,
    rsvpCount: rsvps.length,
    ticketCount: tickets.length,
    totalGuests: guests.length,
    revenueCents,
    guests,
    artistBreakdown: buildArtistBreakdown(guests),
  };
}

// Powers the EVENTS ADMIN tab — KPIs and guest lists across every event, not
// just the caller's own. Unlike getEventHistoryForAccount this deliberately
// lets a real fetch failure throw instead of degrading to an empty result:
// silently showing "0 guests" to staff on a broken connection would be
// actively misleading for an audit/KPI tool. Callers must have already
// confirmed the caller is allowed to see this (Super Admin or the
// eventsAdmin permission) — this function itself does no access check.
export async function getEventsAdminOverview(): Promise<EventsAdminOverview> {
  const rsvps = await getAllRsvps();

  const byEvent = new Map<string, EventRsvpRecord[]>();
  for (const rsvp of rsvps) {
    const list = byEvent.get(rsvp.eventId);
    if (list) list.push(rsvp);
    else byEvent.set(rsvp.eventId, [rsvp]);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming: EventAdminSummary[] = [];
  const past: EventAdminSummary[] = [];

  for (const event of EVENTS) {
    const summary = summarizeEvent(event, byEvent.get(event.id) ?? []);
    const endDate = event.endDate ?? event.startDate;
    if (endDate >= todayKey) upcoming.push(summary);
    else past.push(summary);
  }

  upcoming.sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));
  past.sort((a, b) => b.event.startDate.localeCompare(a.event.startDate));

  const all = [...upcoming, ...past];
  const totalGuests = all.reduce((sum, s) => sum + s.totalGuests, 0);
  const totalRevenueCents = all.reduce((sum, s) => sum + s.revenueCents, 0);
  const eventsWithGuests = all.filter((s) => s.totalGuests > 0).length;
  const topArtists = buildArtistBreakdown(rsvps).slice(0, 10);

  return {
    upcoming,
    past,
    totals: { totalGuests, totalRevenueCents, eventsWithGuests, topArtists },
  };
}
