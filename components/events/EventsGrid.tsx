"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import EventCheckoutModal from "@/components/events/EventCheckoutModal";
import DamageWaiverModal from "@/components/events/DamageWaiverModal";
import EventsCalendar from "@/components/events/EventsCalendar";
import { EVENT_CATEGORIES, requiresDamageWaiver, sortEventsByProximity, type EventCategory, type EventInfo } from "@/lib/events";

const CLOSE_DURATION = 520;

function isEventCategory(value: string | null): value is EventCategory {
  return EVENT_CATEGORIES.some((c) => c.id === value);
}

export default function EventsGrid({ events }: { events: EventInfo[] }) {
  // A link like /events?category=whoadega (used by the "Pop Ups & Retail"
  // tile on /join) pre-filters the grid instead of dumping visitors on the
  // unfiltered list.
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<EventCategory | "all">(() => {
    const requested = searchParams.get("category");
    return isEventCategory(requested) ? requested : "all";
  });
  const [openEvent, setOpenEvent] = useState<EventInfo | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [closing, setClosing] = useState(false);
  const [checkoutEvent, setCheckoutEvent] = useState<EventInfo | null>(null);
  const [waiverEvent, setWaiverEvent] = useState<EventInfo | null>(null);
  const [waiverAgreed, setWaiverAgreed] = useState(false);

  const filtered = sortEventsByProximity(filter === "all" ? events : events.filter((event) => event.category === filter));

  // Every RSVP/Buy Ticket button (card or modal) routes through here rather
  // than setCheckoutEvent directly — a WHOAdega/SH!FT Gallery event needs
  // the damage-responsibility waiver agreed to first (see
  // lib/events.ts's requiresDamageWaiver). Re-checked server-side in
  // eventRsvpAction regardless — this is only what decides which modal
  // opens first.
  function handleCheckoutRequest(event: EventInfo) {
    if (requiresDamageWaiver(event)) {
      setWaiverAgreed(false);
      setWaiverEvent(event);
    } else {
      setCheckoutEvent(event);
    }
  }

  function handleWaiverAgree() {
    if (waiverEvent) {
      setWaiverAgreed(true);
      setCheckoutEvent(waiverEvent);
    }
    setWaiverEvent(null);
  }

  function handleOpen(event: EventInfo, rect: DOMRect) {
    setOpenEvent(event);
    setOriginRect(rect);
    setClosing(false);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setOpenEvent(null);
      setOriginRect(null);
      setClosing(false);
    }, CLOSE_DURATION);
  }

  return (
    <>
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors ${
            filter === "all" ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
          }`}
        >
          All
        </button>
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilter(cat.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide uppercase transition-colors ${
              filter === cat.id ? "btn-flame" : "border border-border-strong text-muted hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Calendar always visible — no more toggling it away behind a
          "Calendar view" button. */}
      <div className="relative z-10 mt-8 flex w-full justify-center px-2">
        <EventsCalendar events={filtered} onOpen={handleOpen} />
      </div>

      <h2 className="font-display relative z-10 mt-14 text-2xl tracking-wide text-foreground">
        All flyers
      </h2>
      <div className="relative z-10 mt-8 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
        {filtered.map((event, i) => (
          <EventCard
            key={event.id}
            event={event}
            delay={i * 0.45}
            onOpen={handleOpen}
            onCheckout={handleCheckoutRequest}
          />
        ))}
      </div>

      {openEvent && originRect && (
        <EventModal
          event={openEvent}
          originRect={originRect}
          closing={closing}
          onClose={handleClose}
          onCheckout={handleCheckoutRequest}
        />
      )}

      {waiverEvent && (
        <DamageWaiverModal event={waiverEvent} onAgree={handleWaiverAgree} onClose={() => setWaiverEvent(null)} />
      )}

      {checkoutEvent && (
        <EventCheckoutModal
          event={checkoutEvent}
          waiverAgreed={waiverAgreed}
          onClose={() => {
            setCheckoutEvent(null);
            setWaiverAgreed(false);
          }}
        />
      )}
    </>
  );
}
