"use client";

import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { getCurrentPriceCents, type EventInfo } from "@/lib/events";
import { useRsvpSet } from "@/components/events/useRsvp";
import { formatCents } from "@/lib/money";

export default function EventCard({
  event,
  delay = 0,
  onOpen,
  onCheckout,
}: {
  event: EventInfo;
  delay?: number;
  onOpen?: (event: EventInfo, rect: DOMRect) => void;
  onCheckout?: (event: EventInfo) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rsvped = useRsvpSet();
  const isIn = rsvped.has(event.id);
  const priceCents = getCurrentPriceCents(event);

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotate(${event.rotate}deg) perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${event.rotate}deg)`;
  }

  function handleOpen() {
    const el = ref.current;
    if (!el || !onOpen) return;
    onOpen(event, el.getBoundingClientRect());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleOpen();
    }
  }

  const [c1, c2, c3] = event.gradient;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          transform: `rotate(${event.rotate}deg)`,
          animationDelay: `${delay}s`,
          "--accent": event.accent,
        } as React.CSSProperties
      }
      className="event-card event-float group relative w-full max-w-sm shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-white/15 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-shadow duration-300 hover:shadow-[0_25px_65px_-15px_var(--accent)]"
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` }}
      />
      <div aria-hidden className="event-card-noise absolute inset-0" />

      <div className="relative z-10 flex h-full flex-col p-5">
        <span className="text-psychedelic font-display text-2xl tracking-wide">WHOA</span>

        <h3 className="font-display mt-2 text-2xl leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] sm:text-3xl">
          {event.title}
        </h3>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-white">
          <span>{event.dateLabel}</span>
          <span className="text-white/70">·</span>
          <span>{event.timeLabel}</span>
        </div>

        {event.lineup && (
          <ul className="mt-3 space-y-0.5">
            {event.lineup.map((act) => (
              <li key={act} className="font-display text-lg leading-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">
                {act}
              </li>
            ))}
          </ul>
        )}

        {event.details && (
          <ul className="mt-3 space-y-1">
            {event.details.map((line) => (
              <li key={line} className="text-xs leading-snug text-white/85">
                {line}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-4">
          <p className="text-xs font-semibold text-white/90">{event.venue}</p>
          <p className="text-xs text-white/70">{event.location}</p>

          {event.tags && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/40 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="event-card-rsvp relative z-20 bg-black/70 p-4 backdrop-blur-sm">
        {/* An event with its own external ticketing gets exactly one CTA —
            an outbound Buy Tickets link — never alongside an in-app RSVP
            button. Real RSVP/ticket checkout is only for events we run. */}
        {event.href ? (
          <a
            href={event.href}
            target="_blank"
            rel="noreferrer"
            onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
            className="block w-full scale-100 rounded-full px-4 py-3 text-center text-sm font-semibold tracking-wide uppercase transition-[scale] duration-300 group-hover:scale-[1.04] btn-flame"
          >
            Buy Tickets
          </a>
        ) : (
          <button
            type="button"
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              onCheckout?.(event);
            }}
            className={`w-full scale-100 rounded-full px-4 py-3 text-sm font-semibold tracking-wide uppercase transition-[scale,background-color,color] duration-300 group-hover:scale-[1.04] ${
              isIn ? "bg-white text-black" : "btn-flame"
            }`}
          >
            {isIn ? "You're in ✓" : priceCents > 0 ? `Buy Ticket ${formatCents(priceCents)}` : "Free RSVP"}
          </button>
        )}
      </div>
    </div>
  );
}
