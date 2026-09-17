"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TicketScanner from "@/components/rsvpAdmin/TicketScanner";
import { checkInByIdAction, undoCheckInAction } from "@/app/rsvp-admin/actions";
import { formatCents } from "@/lib/money";

export interface DoorGuest {
  id: string;
  name: string;
  email: string;
  priceCents: number;
  /** How many people this one booking admits. */
  quantity: number;
  checkedInAt: string | null;
  checkedInBy: string | null;
}

export interface DoorEvent {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  guests: DoorGuest[];
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function GuestRow({ guest, eventId }: { guest: DoorGuest; eventId: string }) {
  const inside = Boolean(guest.checkedInAt);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${inside ? "text-muted line-through" : ""}`}>
          {guest.name}
          {guest.quantity > 1 && (
            <span className="text-flame-3 ml-2 text-xs font-semibold">×{guest.quantity}</span>
          )}
        </p>
        <p className="truncate text-xs text-muted">
          {guest.priceCents > 0 ? formatCents(guest.priceCents * guest.quantity) : "Free RSVP"}
          {inside && guest.checkedInAt ? ` · in at ${timeOnly(guest.checkedInAt)}` : ""}
          {inside && guest.checkedInBy ? ` · ${guest.checkedInBy}` : ""}
        </p>
      </div>

      {inside ? (
        <form action={undoCheckInAction}>
          <input type="hidden" name="rsvpId" value={guest.id} />
          {/* The way back from a mis-scan. A refused ticket is a real
              person standing at the door, so there has to be one. */}
          <button
            type="submit"
            className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold text-muted uppercase transition-colors hover:text-flame-3"
          >
            Undo
          </button>
        </form>
      ) : (
        <form action={checkInByIdAction}>
          <input type="hidden" name="rsvpId" value={guest.id} />
          <input type="hidden" name="eventId" value={eventId} />
          <button
            type="submit"
            className="btn-flame rounded-full px-5 py-1.5 text-xs font-semibold uppercase"
          >
            Check in
          </button>
        </form>
      )}
    </li>
  );
}

/**
 * The door: scan a ticket, or find someone by name.
 *
 * Both paths matter. Scanning is the fast one, but phones die, screenshots
 * get deleted and someone always turns up having bought a ticket on a
 * friend's account — so the searchable list is not a fallback bolted on, it
 * is half the tool.
 *
 * Client-side so the scanner can live alongside the list and the search
 * filters as you type; the check-in writes themselves are Server Actions.
 */
export default function RsvpAdminTab({ events }: { events: DoorEvent[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(events[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [hideArrived, setHideArrived] = useState(false);

  const active = events.find((e) => e.id === activeId) ?? events[0];

  const shown = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    return active.guests.filter((g) => {
      if (hideArrived && g.checkedInAt) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || g.email.toLowerCase().includes(q);
    });
  }, [active, query, hideArrived]);

  if (!active) {
    return (
      <div className="rounded-xl border border-border px-5 py-4 text-sm text-muted">
        No events with a guest list yet. Once people RSVP or buy tickets, they show up here to be
        checked in at the door.
      </div>
    );
  }

  const arrived = active.guests.filter((g) => g.checkedInAt).length;

  return (
    <div className="flex flex-col gap-6">
      {events.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => {
                setActiveId(event.id);
                setQuery("");
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
                event.id === active.id
                  ? "btn-flame"
                  : "border border-border-strong text-muted hover:text-foreground"
              }`}
            >
              {event.title}
            </button>
          ))}
        </div>
      )}

      <div>
        <h3 className="font-display text-2xl tracking-wide">{active.title}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {active.dateLabel} · {active.venue}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Inside</p>
          <p className="font-display mt-1 text-3xl">
            {arrived}
            <span className="text-muted text-xl"> / {active.guests.length}</span>
          </p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Still outside</p>
          <p className="font-display mt-1 text-3xl">{active.guests.length - arrived}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Paid tickets</p>
          <p className="font-display mt-1 text-3xl">
            {active.guests.filter((g) => g.priceCents > 0).reduce((sum, g) => sum + g.quantity, 0)}
          </p>
        </div>
      </div>

      <TicketScanner
        eventId={active.id}
        eventTitle={active.title}
        // A scan writes on the server; refreshing pulls the new counts and
        // struck-through names back down without a full reload.
        onAdmitted={() => router.refresh()}
      />

      <div className="card-surface rounded-2xl border border-border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl tracking-wide">Guest list</h3>
          <label className="flex items-center gap-2 text-xs font-semibold text-muted uppercase">
            <input
              type="checkbox"
              checked={hideArrived}
              onChange={(e) => setHideArrived(e.target.checked)}
              className="accent-[var(--flame-2)]"
            />
            Hide people already in
          </label>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a name or email…"
          className="mt-3 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
        />

        {shown.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border px-4 py-3 text-sm text-muted">
            {query ? `Nobody matching “${query}”.` : "Everyone on this list is inside."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {shown.map((guest) => (
              <GuestRow key={guest.id} guest={guest} eventId={active.id} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
