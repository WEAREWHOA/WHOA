import Link from "next/link";
import { deleteEventAction, unpublishEventAction } from "@/app/events-admin/actions";
import { formatCents } from "@/lib/money";
import type { CustomEventRecord } from "@/lib/eventsStore";
import { portalPath } from "@/lib/portalNav";

/**
 * The events staff have created, drafts included.
 *
 * Only these are listed. The hand-written events in lib/events.ts are
 * not editable from here and showing them with a disabled Edit button
 * would be an invitation to ask why. They still appear in the guest
 * lists below, which is where they are actually worked with.
 */
function status(event: CustomEventRecord, today: string) {
  if (!event.published) return { label: "Draft", tone: "text-muted" };
  if ((event.endDate ?? event.startDate) < today) return { label: "Past", tone: "text-muted" };
  return { label: "Live", tone: "text-flame" };
}

export default function EventManager({
  events,
  bookedByEvent,
}: {
  events: CustomEventRecord[];
  /** Guests already booked, keyed by event id, for the capacity line. */
  bookedByEvent: Map<string, number>;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="flex flex-col gap-3">
      <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-6">
        <div>
          <h3 className="font-semibold">Your events</h3>
          <p className="mt-1 text-sm text-muted">
            {events.length === 0
              ? "None created yet."
              : `${events.length} created here.`}{" "}
            Published ones appear on{" "}
            <Link href="/events" className="text-flame hover:underline">/events</Link>, in the
            calendar, and as a pop-up on /stores when they are not at the shop.
          </p>
        </div>
        <Link
          href={portalPath("events-admin", "edit=new")}
          className="btn-flame rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase"
        >
          Create an event
        </Link>
      </div>

      {events.map((event) => {
        const state = status(event, today);
        const booked = bookedByEvent.get(event.id) ?? 0;
        const remaining = event.capacity == null ? null : event.capacity - booked;

        return (
          <div key={event.id} className="card-surface rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-semibold tracking-[0.15em] uppercase ${state.tone}`}>
                  {state.label} · {event.startDate}
                </p>
                <h4 className="font-display mt-1 text-xl">{event.title}</h4>
                <p className="mt-1 text-sm text-muted">
                  {[event.venue, event.dateLabel, event.timeLabel].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {event.href
                    ? "Ticketed elsewhere"
                    : event.priceCents
                      ? `${formatCents(event.priceCents)}${event.earlyBirdPriceCents ? ` · early bird ${formatCents(event.earlyBirdPriceCents)}` : ""}`
                      : "Free RSVP"}
                  {" · "}
                  {remaining == null ? (
                    `${booked} booked, no cap`
                  ) : (
                    <span className={remaining <= 0 ? "text-flame-3" : undefined}>
                      {booked}/{event.capacity} booked
                      {remaining <= 0 ? " · sold out" : ` · ${remaining} left`}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={portalPath("events-admin", `edit=${event.id}`)}
                  className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
                >
                  Edit
                </Link>
                {event.published && (
                  <form action={unpublishEventAction}>
                    <input type="hidden" name="id" value={event.id} />
                    <button type="submit" className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50">
                      Unpublish
                    </button>
                  </form>
                )}
                {/* Only offered while nobody is booked. Deleting an event
                    with guests would leave their rsvp rows pointing at an
                    id that resolves to nothing, and those rows are
                    somebody's ticket. Unpublish is the answer there. */}
                {booked === 0 ? (
                  <form action={deleteEventAction}>
                    <input type="hidden" name="id" value={event.id} />
                    <button type="submit" className="text-flame-3 rounded-full border border-flame-1/40 px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-flame-1/10">
                      Delete
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-muted">{booked} booked, so it cannot be deleted</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
