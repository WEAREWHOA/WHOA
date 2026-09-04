"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { getCurrentPriceCents, type EventInfo } from "@/lib/events";
import { toggleRsvp, useRsvpSet } from "@/components/events/useRsvp";
import { formatCents } from "@/lib/money";

type Rect = { left: number; top: number; width: number; height: number };

function rectFromDomRect(r: DOMRect): Rect {
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function computeTargetRect(): Rect {
  const width = Math.min(560, window.innerWidth * 0.92);
  const height = Math.min(700, window.innerHeight * 0.86);
  return {
    left: (window.innerWidth - width) / 2,
    top: (window.innerHeight - height) / 2,
    width,
    height,
  };
}

export default function EventModal({
  event,
  originRect,
  closing,
  onClose,
  onCheckout,
}: {
  event: EventInfo;
  originRect: DOMRect;
  closing: boolean;
  onClose: () => void;
  onCheckout?: (event: EventInfo) => void;
}) {
  const [pos, setPos] = useState<Rect>(() => rectFromDomRect(originRect));
  const [flipped, setFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rsvped = useRsvpSet();
  const isIn = rsvped.has(event.id);
  const hasExternalTickets = Boolean(event.href);
  const priceCents = getCurrentPriceCents(event);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPos(computeTargetRect());
        setFlipped(true);
        setMounted(true);
      });
    });
    return () => cancelAnimationFrame(raf1);
  }, []);

  useEffect(() => {
    function handleResize() {
      setPos(computeTargetRect());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const displayPos = closing ? rectFromDomRect(originRect) : pos;
  const displayFlipped = closing ? false : flipped;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  const [c1, c2, c3] = event.gradient;

  return (
    <div
      className="fixed inset-0 z-50 transition-opacity duration-300"
      style={{ opacity: closing || !mounted ? 0 : 1 }}
      onClick={onClose}
    >
      <div aria-hidden className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="event-modal-pos fixed overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
        style={
          {
            left: displayPos.left,
            top: displayPos.top,
            width: displayPos.width,
            height: displayPos.height,
            "--accent": event.accent,
          } as React.CSSProperties
        }
        onClick={(e: ReactMouseEvent) => e.stopPropagation()}
      >
        <div className={`event-modal-flip ${displayFlipped ? "is-flipped" : ""}`}>
          <div className="event-modal-face flex flex-col overflow-hidden p-5" aria-hidden={displayFlipped}>
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` }}
            />
            <div aria-hidden className="event-card-noise absolute inset-0 -z-10" />
            <span className="text-psychedelic font-display text-2xl tracking-wide">WHOA</span>
            <h3 className="font-display mt-2 text-3xl leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              {event.title}
            </h3>
            <p className="mt-3 text-sm font-semibold text-white/90">
              {event.dateLabel} · {event.timeLabel}
            </p>
          </div>

          <div
            className="event-modal-face event-modal-face-back flex flex-col overflow-y-auto bg-surface-raised p-6 text-foreground"
            aria-hidden={!displayFlipped}
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised text-lg text-muted hover:text-foreground"
            >
              ×
            </button>

            <div
              aria-hidden
              className="-mx-6 -mt-6 mb-5 h-28 shrink-0"
              style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` }}
            />

            <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              {event.venue}
            </span>
            <h2 className="font-display mt-1 text-3xl tracking-wide" style={{ color: event.accent }}>
              {event.title}
            </h2>

            <div className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
              <span>{event.dateLabel}</span>
              <span className="text-muted">·</span>
              <span>{event.timeLabel}</span>
            </div>

            {event.lineup && (
              <ul className="mt-4 space-y-0.5">
                {event.lineup.map((act) => (
                  <li key={act} className="font-display text-xl leading-tight">
                    {act}
                  </li>
                ))}
              </ul>
            )}

            {event.details && (
              <ul className="mt-4 space-y-1.5">
                {event.details.map((line) => (
                  <li key={line} className="text-sm leading-snug text-muted">
                    {line}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-4 text-sm font-semibold">{event.venue}</p>
            <p className="text-sm text-muted">{event.location}</p>

            {event.tags && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border-strong px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-3 pt-6">
              <button
                type="button"
                onClick={() => (hasExternalTickets ? toggleRsvp(event.id) : onCheckout?.(event))}
                className={`w-full rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors ${
                  isIn ? "bg-white text-black" : "btn-flame"
                }`}
              >
                {isIn
                  ? "You're in ✓"
                  : hasExternalTickets
                    ? "RSVP"
                    : priceCents > 0
                      ? `Buy Ticket ${formatCents(priceCents)}`
                      : "Free RSVP"}
              </button>
              {event.href && (
                <a
                  href={event.href}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-full border-2 px-6 py-3 text-center text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-white/10"
                  style={{ borderColor: event.accent, color: event.accent }}
                >
                  Buy Tickets
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
