import { getAllRsvps } from "./eventRsvps";
import { EVENTS } from "./events";
import type { DoorEvent } from "@/components/dashboard/tabs/RsvpAdminTab";

/**
 * How far either side of today the door cares about.
 *
 * Yesterday, because a night that runs past midnight is still last night's
 * door; a few weeks ahead, because staff check the list before the day
 * itself. Everything older is history — it belongs in EVENTS ADMIN, not in
 * the thing someone is holding at the entrance.
 */
const DAYS_BACK = 1;
const DAYS_AHEAD = 30;

function dayKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * The guest lists a door might need tonight, soonest first.
 *
 * Only events that actually have someone on the list: an empty event is a
 * button that does nothing, and the door tab opens on whatever is first.
 */
export async function getDoorEvents(): Promise<DoorEvent[]> {
  const rsvps = await getAllRsvps();
  const from = dayKey(-DAYS_BACK);
  const to = dayKey(DAYS_AHEAD);

  const byEvent = new Map<string, typeof rsvps>();
  for (const rsvp of rsvps) {
    const list = byEvent.get(rsvp.eventId);
    if (list) list.push(rsvp);
    else byEvent.set(rsvp.eventId, [rsvp]);
  }

  return EVENTS.filter((event) => {
    const last = event.endDate ?? event.startDate;
    return last >= from && event.startDate <= to && (byEvent.get(event.id)?.length ?? 0) > 0;
  })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((event) => ({
      id: event.id,
      title: event.title,
      dateLabel: event.dateLabel,
      venue: event.venue,
      guests: (byEvent.get(event.id) ?? [])
        .map((rsvp) => ({
          id: rsvp.id,
          name: rsvp.name,
          email: rsvp.email,
          priceCents: rsvp.priceCents,
          checkedInAt: rsvp.checkedInAt,
          checkedInBy: rsvp.checkedInBy,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
