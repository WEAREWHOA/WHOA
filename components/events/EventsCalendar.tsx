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
      className="w-full truncate rounded-md border border-white/10 px-1.5 py-1 text-left text-[0.65rem] leading-tight text-white transition-colors hover:border-[var(--accent)] hover:bg-white/10"
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
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white/70 transition-colors hover:border-white hover:text-white"
        >
          ←
        </button>
        <h2 className="font-display min-w-[12ch] text-center text-2xl tracking-wide text-white">
          {MONTH_LABELS[month]} {year}
        </h2>
        <button
          type="button"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 text-white/70 transition-colors hover:border-white hover:text-white"
        >
          →
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="pb-1 text-center text-[0.65rem] font-semibold tracking-wide text-white/50 uppercase">
            {label}
          </div>
        ))}

        {weeks.map((week, i) =>
          week.map((cell, j) => {
            const isToday = cell.dateKey === todayKey;
            const dayEvents = cell.dateKey ? eventsOnDate(events, cell.dateKey) : [];

            return (
              <div
                key={`${i}-${j}`}
                className={`min-h-20 rounded-lg border p-1.5 sm:min-h-24 sm:p-2 ${
                  cell.day === null
                    ? "border-transparent"
                    : isToday
                      ? "border-flame-2 bg-flame-2/10"
                      : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {cell.day !== null && (
                  <>
                    <span className={`text-xs ${isToday ? "font-bold text-flame-2" : "text-white/50"}`}>
                      {cell.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        {dayEvents.map((event) => (
                          <DayChip key={event.id} event={event} onOpen={onOpen} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
