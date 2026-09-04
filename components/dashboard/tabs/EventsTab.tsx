import Link from "next/link";
import QRCode from "qrcode";
import { formatCents } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import type { EventHistoryEntry } from "@/lib/eventRsvps";

function EventEntryCard({ entry, qrDataUrl }: { entry: EventHistoryEntry; qrDataUrl?: string }) {
  const { event, rsvp } = entry;
  const isTicket = rsvp.priceCents > 0;

  return (
    <div className="card-surface flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border p-5">
      <div>
        <p className="font-display text-lg">{event.title}</p>
        <p className="mt-0.5 text-sm text-muted">
          {event.dateLabel} · {event.timeLabel}
        </p>
        <p className="text-sm text-muted">{event.venue}</p>
        <span
          className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
            isTicket ? "bg-flame-2/15 text-flame-3" : "border border-border-strong text-muted"
          }`}
        >
          {isTicket ? `Ticket · ${formatCents(rsvp.priceCents)}` : "RSVP"}
        </span>
      </div>

      {qrDataUrl && (
        <Link href={`/checkin/${rsvp.id}`} className="shrink-0 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`Ticket QR code for ${event.title}`}
            className="h-24 w-24 rounded-lg border border-border-strong bg-white p-1.5"
          />
          <span className="mt-1 block text-[0.65rem] text-muted underline underline-offset-2">Show ticket</span>
        </Link>
      )}
    </div>
  );
}

export default async function EventsTab({
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

  // Only upcoming entries need a presentable ticket — a past event has
  // nothing left to show at the door. Generated server-side (same approach
  // as the scavenger hunt's print sheet) so no QR library ships to the client.
  const upcomingWithQr = await Promise.all(
    upcoming.map(async (entry) => ({
      entry,
      qrDataUrl: await QRCode.toDataURL(`${SITE_URL}/checkin/${entry.rsvp.id}`, { margin: 1, width: 240 }).catch(
        (err) => {
          console.error(`Failed to generate ticket QR for RSVP ${entry.rsvp.id}:`, err);
          return undefined;
        },
      ),
    })),
  );

  return (
    <div>
      <h3 className="font-display text-xl">Upcoming</h3>
      {upcoming.length === 0 ? (
        <p className="border-border mt-4 rounded-xl border px-5 py-4 text-sm text-muted">
          Nothing upcoming — you&apos;re all caught up.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {upcomingWithQr.map(({ entry, qrDataUrl }) => (
            <EventEntryCard key={entry.rsvp.id} entry={entry} qrDataUrl={qrDataUrl} />
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
