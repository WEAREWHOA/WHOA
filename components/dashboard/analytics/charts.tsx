"use client";

import { useState } from "react";
import type { Funnel, Point } from "@/lib/kpiReport";

/**
 * The chart kit for the ANALYTICS tab.
 *
 * Plain SVG, no charting dependency. The palette is the validated
 * categorical set (see --an-series-* in globals.css): fixed order, never
 * cycled, and colour follows the entity rather than its rank, so
 * filtering the page doesn't repaint what survives.
 *
 * Every axis here is a count or an amount, and no chart carries two of
 * them — two measures means two charts, never two y-scales.
 */

function niceMax(values: number[]): number {
  const max = Math.max(1, ...values);
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

function shortDay(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}/${Number(day)}`;
}

/** A single measure over time. Bars, because the day is a bucket. */
export function TimeSeries({
  points,
  format = (n) => n.toLocaleString(),
  accent = "var(--an-series-1)",
}: {
  points: Point[];
  format?: (n: number) => string;
  accent?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(points.map((p) => p.value));
  const active = hover === null ? null : points[hover];

  if (!points.length) return <p className="an-empty">Nothing recorded yet.</p>;

  return (
    <div className="an-plot">
      <div className="an-plot-head">
        <span className="an-plot-value">
          {active ? format(active.value) : format(points.reduce((s, p) => s + p.value, 0))}
        </span>
        <span className="an-plot-label">
          {active ? shortDay(active.label) : `total over ${points.length} days`}
        </span>
      </div>

      <div className="an-bars" onMouseLeave={() => setHover(null)}>
        {points.map((point, i) => (
          <button
            type="button"
            key={point.label}
            className={`an-bar-hit ${hover === i ? "an-bar-hit-on" : ""}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            aria-label={`${point.label}: ${format(point.value)}`}
          >
            <span
              className="an-bar"
              style={{
                height: `${Math.max(2, (point.value / max) * 100)}%`,
                background: accent,
              }}
            />
          </button>
        ))}
      </div>

      <div className="an-axis">
        <span>{shortDay(points[0].label)}</span>
        <span>{shortDay(points[points.length - 1].label)}</span>
      </div>
    </div>
  );
}

/** A ranked list. Horizontal, because the labels are words. */
export function RankedBars({
  points,
  format = (n) => n.toLocaleString(),
  accent = "var(--an-series-3)",
}: {
  points: Point[];
  format?: (n: number) => string;
  accent?: string;
}) {
  if (!points.length) return <p className="an-empty">Nothing recorded yet.</p>;
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <ul className="an-ranked">
      {points.map((point) => (
        <li key={point.label}>
          <div className="an-ranked-row">
            <span className="an-ranked-label" title={point.label}>
              {point.label}
            </span>
            <span className="an-ranked-value">{format(point.value)}</span>
          </div>
          <span className="an-ranked-track">
            <span
              className="an-ranked-fill"
              style={{ width: `${Math.max(1.5, (point.value / max) * 100)}%`, background: accent }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Parts of one whole. One stacked bar, always with a labelled legend. */
export function SplitBar({ points }: { points: Point[] }) {
  if (!points.length) return <p className="an-empty">Nothing recorded yet.</p>;
  const total = points.reduce((s, p) => s + p.value, 0) || 1;

  return (
    <div>
      <div className="an-split">
        {points.map((point, i) => (
          <span
            key={point.label}
            className="an-split-seg"
            style={{
              width: `${(point.value / total) * 100}%`,
              background: `var(--an-series-${(i % 8) + 1})`,
            }}
            title={`${point.label}: ${point.value.toLocaleString()}`}
          />
        ))}
      </div>
      <ul className="an-legend">
        {points.map((point, i) => (
          <li key={point.label}>
            <span className="an-swatch" style={{ background: `var(--an-series-${(i % 8) + 1})` }} />
            {point.label}
            <span className="an-legend-value">
              {Math.round((point.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * When the site is busy, by hour and weekday.
 *
 * A sequential ramp — one hue, dark to light — because the value is a
 * magnitude. A rainbow here would imply the 9am cell is a different
 * *kind* of thing from the 10am one.
 */
export function Heatmap({ grid }: { grid: number[][] }) {
  const [hover, setHover] = useState<{ day: number; hour: number } | null>(null);
  const max = Math.max(1, ...grid.flat());
  const total = grid.flat().reduce((s, n) => s + n, 0);

  if (!total) return <p className="an-empty">No traffic recorded yet.</p>;

  const step = (value: number) => {
    if (!value) return 0;
    return Math.min(5, Math.ceil((value / max) * 5));
  };

  const active = hover ? grid[hover.day][hover.hour] : null;

  return (
    <div>
      <div className="an-plot-head">
        <span className="an-plot-value">
          {active === null ? total.toLocaleString() : active.toLocaleString()}
        </span>
        <span className="an-plot-label">
          {hover
            ? `${DAY_NAMES[hover.day]} ${String(hover.hour).padStart(2, "0")}:00 Pacific`
            : "views in this window"}
        </span>
      </div>

      <div className="an-heat" onMouseLeave={() => setHover(null)}>
        {grid.map((row, day) => (
          <div className="an-heat-row" key={day}>
            <span className="an-heat-day">{DAY_NAMES[day]}</span>
            {row.map((value, hour) => (
              <button
                type="button"
                key={hour}
                className="an-heat-cell"
                data-step={step(value)}
                onMouseEnter={() => setHover({ day, hour })}
                onFocus={() => setHover({ day, hour })}
                onBlur={() => setHover(null)}
                aria-label={`${DAY_NAMES[day]} ${hour}:00 — ${value} views`}
              />
            ))}
          </div>
        ))}
        <div className="an-heat-row an-heat-hours">
          <span className="an-heat-day" />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="an-heat-hour">
              {hour % 6 === 0 ? hour : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="an-heat-key">
        <span>Quiet</span>
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="an-heat-cell an-heat-key-cell" data-step={s} />
        ))}
        <span>Busy</span>
      </div>
    </div>
  );
}

/** Each step as a share of the one above it, with the drop named. */
export function FunnelChart({ funnel }: { funnel: Funnel }) {
  const top = funnel.steps[0]?.value ?? 0;

  return (
    <div>
      <p className="an-panel-blurb">{funnel.blurb}</p>
      <ul className="an-funnel">
        {funnel.steps.map((step, i) => {
          const previous = i === 0 ? step.value : funnel.steps[i - 1].value;
          const width = top ? Math.max(2, (step.value / top) * 100) : 2;
          return (
            <li key={step.label}>
              <div className="an-ranked-row">
                <span className="an-ranked-label">{step.label}</span>
                <span className="an-ranked-value">
                  {step.value.toLocaleString()}
                  {i > 0 && (
                    <span className="an-funnel-drop">
                      {previous ? `${Math.round((step.value / previous) * 100)}%` : "—"}
                    </span>
                  )}
                </span>
              </div>
              <span className="an-ranked-track">
                <span
                  className="an-ranked-fill"
                  style={{ width: `${width}%`, background: `var(--an-series-${(i % 8) + 1})` }}
                />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
