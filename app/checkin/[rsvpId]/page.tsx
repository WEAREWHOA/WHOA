import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRsvpById } from "@/lib/eventRsvps";
import { EVENTS } from "@/lib/events";
import { formatCents } from "@/lib/money";

export const metadata: Metadata = { title: "Ticket" };

// Deliberately public and read-only — same posture as a paper ticket:
// whoever has the link (from the QR code) can see it. This shows ticket
// details for door staff to check by eye; it doesn't mark attendance or
// prevent a ticket being shown twice — that's real check-in tooling this
// doesn't attempt to be yet.
export default async function CheckinPage(props: PageProps<"/checkin/[rsvpId]">) {
  const { rsvpId } = await props.params;

  const rsvp = await getRsvpById(rsvpId).catch((err) => {
    console.error(`Failed to look up RSVP ${rsvpId} for /checkin:`, err);
    return undefined;
  });
  if (!rsvp) notFound();

  const event = EVENTS.find((e) => e.id === rsvp.eventId);
  if (!event) notFound();

  const isTicket = rsvp.priceCents > 0;

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="bg-flame-2/15 text-flame-3 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.2em] uppercase">
        {isTicket ? "Valid ticket" : "Valid RSVP"}
      </span>
      <h1 className="font-display mt-4 text-3xl tracking-wide sm:text-4xl">{event.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {event.dateLabel} · {event.timeLabel}
      </p>
      <p className="text-sm text-muted">{event.venue}</p>

      <div className="card-surface mt-8 w-full rounded-2xl border border-border-strong p-6 text-left">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ticket holder</p>
        <p className="font-display mt-1 text-2xl">{rsvp.name}</p>
        {isTicket && <p className="mt-3 text-sm text-muted">Paid {formatCents(rsvp.priceCents)}</p>}
      </div>

      <p className="mt-6 font-mono-code text-xs text-muted">{rsvp.id}</p>
    </section>
  );
}
