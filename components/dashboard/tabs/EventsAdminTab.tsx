import { formatCents } from "@/lib/money";
import type { EventAdminSummary, EventsAdminOverview } from "@/lib/eventsAdmin";
import { reviewWorkSignupAction } from "@/app/events-admin/actions";

function WorkSignupRow({ pending }: { pending: EventsAdminOverview["pendingWorkSignups"][number] }) {
  const { signup, event, accountName, accountEmail } = pending;
  return (
    <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-semibold">{accountName}</p>
        <p className="text-xs text-muted">{accountEmail}</p>
        <p className="mt-1 text-sm">
          wants to work <span className="font-semibold">{event.title}</span> · {event.dateLabel}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <form action={reviewWorkSignupAction}>
          <input type="hidden" name="signupId" value={signup.id} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            className="rounded-full bg-tier-icon px-4 py-2 text-xs font-semibold tracking-wide text-background uppercase"
          >
            Approve
          </button>
        </form>
        <form action={reviewWorkSignupAction}>
          <input type="hidden" name="signupId" value={signup.id} />
          <input type="hidden" name="decision" value="declined" />
          <button
            type="submit"
            className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase hover:text-foreground"
          >
            Decline
          </button>
        </form>
      </div>
    </div>
  );
}

function GuestRow({ guest }: { guest: EventAdminSummary["guests"][number] }) {
  const isTicket = guest.priceCents > 0;
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2 pr-4">{guest.name}</td>
      <td className="py-2 pr-4 text-muted">{guest.email}</td>
      <td className="py-2 pr-4 text-muted">{guest.phone ?? "—"}</td>
      <td className="py-2 pr-4">{guest.selectedArtist ?? "—"}</td>
      <td className="py-2 pr-4">{isTicket ? formatCents(guest.priceCents) : "RSVP"}</td>
      <td className="py-2 text-muted">{new Date(guest.createdAt).toLocaleString()}</td>
    </tr>
  );
}

function EventDetails({ summary }: { summary: EventAdminSummary }) {
  const { event } = summary;
  return (
    <details className="card-surface rounded-xl border border-border p-4 open:pb-5">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg">{event.title}</p>
          <p className="text-sm text-muted">
            {event.dateLabel} · {event.venue}
          </p>
        </div>
        <div className="flex gap-4 text-right text-sm">
          <span>
            <span className="block font-display text-xl">{summary.totalGuests}</span>
            <span className="block text-xs text-muted uppercase">Guests</span>
          </span>
          <span>
            <span className="block font-display text-xl">{formatCents(summary.revenueCents)}</span>
            <span className="block text-xs text-muted uppercase">Revenue</span>
          </span>
        </div>
      </summary>

      {summary.artistBreakdown.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.artistBreakdown.map(({ artist, count }) => (
            <span
              key={artist}
              className="rounded-full border border-border-strong px-3 py-1 text-xs text-muted"
            >
              {artist} · {count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {summary.guests.length === 0 ? (
          <p className="text-sm text-muted">No RSVPs or tickets yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-strong text-xs text-muted uppercase">
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Email</th>
                <th className="py-2 pr-4 font-semibold">Phone</th>
                <th className="py-2 pr-4 font-semibold">Artist</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 font-semibold">When</th>
              </tr>
            </thead>
            <tbody>
              {summary.guests.map((guest) => (
                <GuestRow key={guest.id} guest={guest} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}

export default function EventsAdminTab({ data }: { data: EventsAdminOverview }) {
  const { upcoming, past, totals, pendingWorkSignups } = data;

  return (
    <div>
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Events Admin</span>
      <h3 className="font-display mt-1 text-2xl">Every event, one place</h3>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Total guests</p>
          <p className="font-display mt-1 text-3xl">{totals.totalGuests}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Total revenue</p>
          <p className="font-display mt-1 text-3xl">{formatCents(totals.totalRevenueCents)}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Events with signups</p>
          <p className="font-display mt-1 text-3xl">{totals.eventsWithGuests}</p>
        </div>
      </div>

      <h4 className="font-display mt-10 text-xl">Work signup requests</h4>
      {pendingWorkSignups.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">
          No pending requests to work an event.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {pendingWorkSignups.map((pending) => (
            <WorkSignupRow key={pending.signup.id} pending={pending} />
          ))}
        </div>
      )}

      {totals.topArtists.length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Most-requested artists</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {totals.topArtists.map(({ artist, count }) => (
              <span
                key={artist}
                className="bg-flame-2/10 text-flame-3 rounded-full px-3 py-1 text-xs font-medium"
              >
                {artist} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <h4 className="font-display mt-10 text-xl">Upcoming</h4>
      {upcoming.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">No upcoming events.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {upcoming.map((summary) => (
            <EventDetails key={summary.event.id} summary={summary} />
          ))}
        </div>
      )}

      <h4 className="font-display mt-10 text-xl">Past</h4>
      {past.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border px-5 py-4 text-sm text-muted">No past events on file yet.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {past.map((summary) => (
            <EventDetails key={summary.event.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
