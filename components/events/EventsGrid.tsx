"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/events/EventCard";
import EventModal from "@/components/events/EventModal";
import EventsCalendar from "@/components/events/EventsCalendar";
import { EVENT_CATEGORIES, type EventCategory, type EventInfo } from "@/lib/events";

const CLOSE_DURATION = 520;

function isEventCategory(value: string | null): value is EventCategory {
  return EVENT_CATEGORIES.some((c) => c.id === value);
}

export default function EventsGrid({ events }: { events: EventInfo[] }) {
  // A link like /events?category=whoadega (used by the "Pop Ups & Retail"
  // tile on /join) pre-filters the grid instead of dumping visitors on the
  // unfiltered list.
  const searchParams = useSearchParams();
  const [view, setView] = useState<"cards" | "calendar">("cards");
  const [filter, setFilter] = useState<EventCategory | "all">(() => {
    const requested = searchParams.get("category");
    return isEventCategory(requested) ? requested : "all";
  });
  const [openEvent, setOpenEvent] = useState<EventInfo | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [closing, setClosing] = useState(false);

  const filtered = filter === "all" ? events : events.filter((event) => event.category === filter);

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
      <button
        type="button"
        onClick={() => setView(view === "cards" ? "calendar" : "cards")}
        className="relative z-10 mt-8 rounded-full border-2 border-white/40 px-6 py-2 text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:border-white hover:bg-white/10"
      >
        {view === "cards" ? "Calendar view" : "Flyer view"}
      </button>

      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide transition-colors ${
            filter === "all" ? "btn-flame" : "border border-white/30 text-white/70 hover:text-white"
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
              filter === cat.id ? "btn-flame" : "border border-white/30 text-white/70 hover:text-white"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {view === "cards" ? (
        <div className="relative z-10 mt-10 flex w-full max-w-6xl flex-wrap items-start justify-center gap-x-8 gap-y-14">
          {filtered.map((event, i) => (
            <EventCard key={event.id} event={event} delay={i * 0.45} onOpen={handleOpen} />
          ))}
        </div>
      ) : (
        <div className="relative z-10 mt-10 flex w-full justify-center px-2">
          <EventsCalendar events={filtered} onOpen={handleOpen} />
        </div>
      )}

      {openEvent && originRect && (
        <EventModal event={openEvent} originRect={originRect} closing={closing} onClose={handleClose} />
      )}
    </>
  );
}
