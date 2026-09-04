import Link from "next/link";
import { formatCents } from "@/lib/money";
import type { EventHistoryEntry } from "@/lib/eventRsvps";

function EventEntryCard({ entry }: { entry: EventHistoryEntry }) {
  const { event, rsvp } = entry;
  const isTicket = rsvp.priceCents > 0;

  return (
    <div className="card-surface rounded-2xl border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg">{event.title}</p>
          <p className="mt-0.5 text-sm text-muted">
            {event.dateLabel} · {event.timeLabel}
          </p>
          <p className="text-sm text-muted">{event.venue}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
            isTicket ? "bg-flame-2/15 text-flame-3" : "border border-border-strong text-muted"
          }`}
        >
          {isTicket ? `Ticket · ${formatCents(rsvp.priceCents)}` : "RSVP"}
        </span>
      </div>
    </div>
  );
}

export default function EventsTab({
  upcoming,
  past,
}: {
  upcoming: EventHistoryEntry[];
  past: EventHistoryEntry[];
}) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        No RSVPs or tickets yet — head to{" "}
        <Link href="/events" className="text-flame font-medium hover:underline">
          Events
        </Link>{" "}
        to find something.
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-display text-xl">Upcoming</h3>
      {upcoming.length === 0 ? (
        <p className="border-border mt-4 rounded-xl border px-5 py-4 text-sm text-muted">
          Nothing upcoming — you&apos;re all caught up.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {upcoming.map((entry) => (
            <EventEntryCard key={entry.rsvp.id} entry={entry} />
          ))}
        </div>
      )}

      <h3 className="font-display mt-8 text-xl">Past</h3>
      {past.length === 0 ? (
        <p className="border-border mt-4 rounded-xl border px-5 py-4 text-sm text-muted">
          No past events on file yet.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {past.map((entry) => (
            <EventEntryCard key={entry.rsvp.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
