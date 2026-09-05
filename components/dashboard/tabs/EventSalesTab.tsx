import Link from "next/link";
import { signupToWorkEventAction } from "@/lib/actions";
import type { EventSalesSignup, ScheduleEntry } from "@/lib/eventSales";
import type { EventInfo } from "@/lib/events";

const STATUS_LABEL: Record<EventSalesSignup["status"], string> = {
  pending: "Pending approval",
  approved: "You're scheduled ✓",
  declined: "Not approved for this one",
};

function EventSignupRow({
  code,
  event,
  signup,
}: {
  code: string;
  event: EventInfo;
  signup?: EventSalesSignup;
}) {
  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-5">
      <div>
        <p className="font-display text-lg">{event.title}</p>
        <p className="mt-0.5 text-sm text-muted">
          {event.dateLabel} · {event.timeLabel}
        </p>
        <p className="text-sm text-muted">{event.venue}</p>
      </div>

      {signup ? (
        <span
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase ${
            signup.status === "approved"
              ? "bg-tier-icon text-background"
              : signup.status === "declined"
                ? "border border-border-strong text-muted"
                : "bg-flame-2/15 text-flame-3"
          }`}
        >
          {STATUS_LABEL[signup.status]}
        </span>
      ) : (
        <form action={signupToWorkEventAction}>
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="eventId" value={event.id} />
          <button
            type="submit"
            className="btn-flame shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold tracking-wide uppercase"
          >
            Sign up to work
          </button>
        </form>
      )}
    </div>
  );
}

export default function EventSalesTab({
  code,
  upcoming,
  signups,
  schedule,
  workSignup,
}: {
  code: string;
  upcoming: EventInfo[];
  signups: EventSalesSignup[];
  schedule: ScheduleEntry[];
  workSignup?: string;
}) {
  const signupByEvent = new Map(signups.map((s) => [s.eventId, s]));

  return (
    <div>
      <div className="border-flame-2/40 bg-flame-2/10 rounded-xl border px-5 py-4 text-sm text-muted">
        Sign up to work any event below — we&apos;ll review and confirm by email, and approved
        events land in your schedule. New to the crew?{" "}
        <Link href="/event-sales/welcome-guide" className="text-flame font-medium hover:underline">
          Read the Welcome Guide
        </Link>
        .
      </div>

      {workSignup === "requested" && (
        <p className="mt-4 rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-3 text-sm text-flame-3">
          Request sent — we&apos;ll confirm by email once it&apos;s approved.
        </p>
      )}
      {workSignup === "error" && (
        <p className="mt-4 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          Something went wrong sending that request — try again.
        </p>
      )}

      <h3 className="font-display mt-8 text-xl">Your schedule</h3>
      {schedule.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
          Nothing scheduled yet — sign up to work an event below.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {schedule.map(({ event }) => (
            <EventSignupRow key={event.id} code={code} event={event} signup={signupByEvent.get(event.id)} />
          ))}
        </div>
      )}

      <h3 className="font-display mt-8 text-xl">Upcoming events</h3>
      {upcoming.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
          No upcoming events right now.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {upcoming.map((event) => (
            <EventSignupRow key={event.id} code={code} event={event} signup={signupByEvent.get(event.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
