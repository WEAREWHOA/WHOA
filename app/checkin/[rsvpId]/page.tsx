import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { getRsvpById } from "@/lib/eventRsvps";
import { EVENTS } from "@/lib/events";
import { formatCents } from "@/lib/money";
import { checkInByIdAction, undoCheckInAction } from "@/app/rsvp-admin/actions";

export const metadata: Metadata = { title: "Ticket" };

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * One ticket, seen two ways.
 *
 * To a guest it stays what it always was — a paper ticket, readable by
 * whoever holds the link, showing the event and their name. To signed-in
 * door staff (this is the page a phone's own camera lands on when it scans
 * the QR) it also becomes the thing that spends the ticket: a check-in
 * button, or a refusal if it's already been used.
 *
 * The status is worked out here and shown to everyone, guests included. A
 * guest who scans their own ticket after walking in should see that it's
 * been used — that's the honest answer, and it's how they find out early
 * rather than at the door next time.
 */
export default async function CheckinPage(props: PageProps<"/checkin/[rsvpId]">) {
  const { rsvpId } = await props.params;

  const rsvp = await getRsvpById(rsvpId).catch((err) => {
    console.error(`Failed to look up RSVP ${rsvpId} for /checkin:`, err);
    return undefined;
  });
  if (!rsvp) notFound();

  const event = EVENTS.find((e) => e.id === rsvp.eventId);
  if (!event) notFound();

  const sessionCode = await getSessionAmbassadorCode();
  const viewer = sessionCode ? await getByCode(sessionCode) : undefined;
  const isDoorStaff = Boolean(
    viewer && (viewer.isSuperAdmin || viewer.permissions.rsvpAdmin || viewer.permissions.eventsAdmin),
  );

  const isTicket = rsvp.priceCents > 0;
  const used = Boolean(rsvp.checkedInAt);

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {/* The verdict, first and biggest — on a door this is the only thing
          anyone reads. A used ticket is refused, and says so in the same
          place a good one says "valid". */}
      {used ? (
        <span className="border-flame-1 bg-flame-1/15 text-flame-3 rounded-full border-2 px-5 py-2 text-sm font-semibold tracking-[0.2em] uppercase">
          Refused — already used
        </span>
      ) : (
        <span className="bg-flame-2/15 text-flame-3 rounded-full px-4 py-1.5 text-xs font-semibold tracking-[0.2em] uppercase">
          {isTicket ? "Valid ticket" : "Valid RSVP"}
        </span>
      )}

      <h1 className="font-display mt-4 text-3xl tracking-wide sm:text-4xl">{event.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {event.dateLabel} · {event.timeLabel}
      </p>
      <p className="text-sm text-muted">{event.venue}</p>

      <div className="card-surface mt-8 w-full rounded-2xl border border-border-strong p-6 text-left">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Ticket holder</p>
        <p className="font-display mt-1 text-2xl">{rsvp.name}</p>

        {/* How many people this one code lets in. Door staff read this off
            the phone to know whether it's one guest or a group of five, so
            it gets more weight than the price does. */}
        {rsvp.quantity > 1 && (
          <p className="text-flame-3 font-display mt-2 text-xl">Admits {rsvp.quantity}</p>
        )}

        {isTicket && (
          <p className="mt-3 text-sm text-muted">
            Paid {formatCents(rsvp.priceCents * rsvp.quantity)}
            {rsvp.quantity > 1 ? ` (${rsvp.quantity} × ${formatCents(rsvp.priceCents)})` : ""}
          </p>
        )}

        {used && rsvp.checkedInAt && (
          <p className="text-flame-3 mt-3 text-sm">
            Came in at {timeOnly(rsvp.checkedInAt)}
            {rsvp.checkedInBy ? ` · scanned by ${rsvp.checkedInBy}` : ""}
          </p>
        )}
      </div>

      {/* Only door staff get to spend a ticket. Gated on the session, not
          on anything in the URL — the guest holding this link must not be
          able to check themselves in. */}
      {isDoorStaff && (
        <div className="mt-6 w-full">
          {used ? (
            <form action={undoCheckInAction}>
              <input type="hidden" name="rsvpId" value={rsvp.id} />
              <button
                type="submit"
                className="w-full rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-muted uppercase transition-colors hover:text-flame-3"
              >
                Undo check-in
              </button>
              <p className="mt-2 text-xs text-muted">
                Only if this was scanned by mistake — it lets them in again.
              </p>
            </form>
          ) : (
            <form action={checkInByIdAction}>
              <input type="hidden" name="rsvpId" value={rsvp.id} />
              <input type="hidden" name="eventId" value={rsvp.eventId} />
              <button type="submit" className="btn-flame w-full rounded-full px-6 py-4 text-base">
                {rsvp.quantity > 1 ? `Check in all ${rsvp.quantity}` : `Check in ${rsvp.name}`}
              </button>
            </form>
          )}
        </div>
      )}

      <p className="font-mono-code mt-6 text-xs text-muted">{rsvp.id}</p>
    </section>
  );
}
