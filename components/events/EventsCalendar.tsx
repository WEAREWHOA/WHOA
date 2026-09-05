"use client";

import { useMemo, useRef, useState } from "react";
import type { EventInfo } from "@/lib/events";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventsOnDate(events: EventInfo[], dateKey: string): EventInfo[] {
  return events.filter((event) => dateKey >= event.startDate && dateKey <= (event.endDate ?? event.startDate));
}

function DayChip({ event, onOpen }: { event: EventInfo; onOpen: (event: EventInfo, rect: DOMRect) => void }) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick() {
    const el = ref.current;
    if (!el) return;
    onOpen(event, el.getBoundingClientRect());
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      style={{ "--accent": event.accent } as React.CSSProperties}
      className="w-full truncate rounded-md border border-border-strong bg-surface px-1.5 py-1 text-left text-[0.65rem] leading-tight text-foreground transition-colors hover:border-[var(--accent)] hover:bg-surface-raised"
    >
      <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: event.accent }} />
      {event.title}
    </button>
  );
}

export default function EventsCalendar({
  events,
  onOpen,
}: {
  events: EventInfo[];
  onOpen: (event: EventInfo, rect: DOMRect) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

    const cells: { day: number | null; dateKey: string | null }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const day = i - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) {
        cells.push({ day: null, dateKey: null });
      } else {
        cells.push({ day, dateKey: toDateKey(year, month, day) });
      }
    }

    const result: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [year, month]);

  return (
    <div className="card-surface w-full max-w-5xl rounded-2xl border border-border-strong p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] sm:p-6">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-muted transition-colors hover:border-flame-2/60 hover:text-foreground"
        >
          ←
        </button>
        <h2 className="font-display min-w-[12ch] text-center text-2xl tracking-wide text-foreground">
          {MONTH_LABELS[month]} {year}
        </h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong text-muted transition-colors hover:border-flame-2/60 hover:text-foreground"
        >
          →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-center text-[0.65rem] font-semibold tracking-wide text-muted uppercase">
            {label}
          </div>
        ))}

        {weeks.map((week, i) =>
          week.map((cell, j) => {
            const isToday = cell.dateKey === todayKey;
            const dayEvents = cell.dateKey ? eventsOnDate(events, cell.dateKey) : [];
            // When more than one event lands on the same day, only the
            // first's flyer fills the cell — the day still lists every
            // event as its own chip on top.
            const cellImage = dayEvents.find((event) => event.imageUrl)?.imageUrl;

            return (
              <div
                key={`${i}-${j}`}
                className={`relative min-h-20 overflow-hidden rounded-lg border p-1.5 sm:min-h-24 sm:p-2 ${
                  cell.day === null
                    ? "border-transparent"
                    : isToday
                      ? "border-flame-2 bg-flame-2/15"
                      : "border-border bg-surface-raised"
                }`}
              >
                {cellImage && (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cellImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div aria-hidden className="absolute inset-0 bg-black/55" />
                  </>
                )}

                {cell.day !== null && (
                  <div className="relative">
                    <span
                      className={`text-xs ${
                        cellImage
                          ? "font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                          : isToday
                            ? "font-bold text-flame-2"
                            : "text-muted"
                      }`}
                    >
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        {dayEvents.map((event) => (
                          <DayChip key={event.id} event={event} onOpen={onOpen} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
