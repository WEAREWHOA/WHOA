"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import EventCheckoutModal from "@/components/events/EventCheckoutModal";
import DamageWaiverModal from "@/components/events/DamageWaiverModal";
import EventsCalendar from "@/components/events/EventsCalendar";
import { eventCheckoutDraft } from "@/lib/checkoutDrafts";
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

  // Cash App Pay on a phone sends the customer out to the Cash App and
  // drops them back here on a fresh page load — with their ticket form and
  // the modal that held it gone. Reopening it is what gives Square's SDK a
  // live checkout to hand the token it's carrying back to. Derived rather
  // than set in an effect, so the reopen happens in the same render the
  // draft first becomes readable. See lib/checkoutDrafts.ts.
  const draft = eventCheckoutDraft.useDraft();
  const restoredDraft = checkoutEvent ? null : draft;
  const restoredEvent = restoredDraft
    ? (events.find((event) => event.id === restoredDraft.eventId) ?? null)
    : null;
  const activeCheckout = checkoutEvent ?? restoredEvent;

  const filtered = sortEventsByProximity(filter === "all" ? events : events.filter((event) => event.category === filter));

  // Every RSVP/Buy Ticket button (card or modal) routes through here rather
  // than setCheckoutEvent directly — a WHOAdega/SH!FT Gallery event needs
  // the damage-responsibility waiver agreed to first (see
  // lib/events.ts's requiresDamageWaiver). Re-checked server-side in
  // eventRsvpAction regardless — this is only what decides which modal
  // opens first.
  function handleCheckoutRequest(event: EventInfo) {
    eventCheckoutDraft.clear();
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

  // Whether this component put the current entry in the history stack,
  // so closing knows whether to step back or just shut the card.
  const pushedUrl = useRef(false);
  // Set once a deep-linked card has been closed, so it does not reopen
  // on the next render while ?event= is still in the URL.
  const [dismissedRequest, setDismissedRequest] = useState(false);

  // The visual close on its own, with no history in it. Both the close
  // button and the browser's own Back arrive here eventually, and only
  // one of them should be moving through history.
  const closeCard = useCallback(() => {
    setDismissedRequest(true);
    setClosing(true);
    setTimeout(() => {
      setOpenEvent(null);
      setOriginRect(null);
      setClosing(false);
    }, CLOSE_DURATION);
  }, []);

  /**
   * Opening a flyer now changes the address bar to that event's own
   * page, which exists and is server-rendered -- see app/events/[slug].
   *
   * pushState rather than a router navigation, because navigating would
   * replace the calendar with that page and lose the card animation
   * that makes this worth having. The URL is the honest one either way:
   * copy it, share it, reload it, and the event is there.
   */
  function handleOpen(event: EventInfo, rect: DOMRect) {
    setOpenEvent(event);
    setOriginRect(rect);
    setClosing(false);
    try {
      window.history.pushState({ whoaEvent: event.id }, "", `/events/${encodeURIComponent(event.id)}`);
      pushedUrl.current = true;
    } catch {
      // A blocked history write costs the shareable URL and nothing
      // else; the card still opens.
    }
  }

  function handleClose() {
    if (pushedUrl.current) {
      pushedUrl.current = false;
      // Back undoes the entry this added, and the popstate below does
      // the closing. Going forward instead would leave the event's URL
      // in history behind a card that is no longer open.
      window.history.back();
      return;
    }
    closeCard();
  }

  // Back out of an open card rather than off the page entirely, which is
  // what a URL in the address bar leads somebody to expect.
  useEffect(() => {
    function onPopState() {
      pushedUrl.current = false;
      setOpenEvent((current) => {
        if (current) closeCard();
        return current;
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [closeCard]);

  // /events?event=<id> opens that flyer on arrival. It is how an event's
  // own page sends somebody back here to RSVP, rather than that page
  // carrying a second copy of the checkout.
  //
  // Derived rather than set in an effect, the same way the restored
  // Cash App draft above is: the card is open on the first render the
  // parameter is readable, with no flash of the bare calendar first.
  const requestedId = searchParams.get("event");
  const requested = requestedId
    ? (events.find((event) => event.id === requestedId) ?? null)
    : null;
  const activeEvent = openEvent ?? (dismissedRequest ? null : requested);
  // A deep link has no card on screen, so there is no rectangle to grow
  // out of and the modal opens from the middle instead.
  const activeRect = openEvent ? originRect : null;

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

      {activeEvent && (
        <EventModal
          event={activeEvent}
          originRect={activeRect}
          closing={closing}
          onClose={handleClose}
          onCheckout={handleCheckoutRequest}
        />
      )}

      {waiverEvent && (
        <DamageWaiverModal event={waiverEvent} onAgree={handleWaiverAgree} onClose={() => setWaiverEvent(null)} />
      )}

      {activeCheckout && (
        <EventCheckoutModal
          // Remounts on a restore so the form starts from the parked
          // values rather than the blank state it first mounted with.
          key={restoredEvent ? `${activeCheckout.id}-restored` : activeCheckout.id}
          event={activeCheckout}
          waiverAgreed={restoredEvent ? restoredDraft?.waiverAgreed === true : waiverAgreed}
          restored={restoredEvent ? (restoredDraft ?? undefined) : undefined}
          onClose={() => {
            eventCheckoutDraft.clear();
            setCheckoutEvent(null);
            setWaiverAgreed(false);
          }}
        />
      )}
    </>
  );
}
