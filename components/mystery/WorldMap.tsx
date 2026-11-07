"use client";

import Link from "next/link";
import { useState } from "react";

import Prop from "./Prop";
import { COLS, ROADS, ROWS, SCENERY, STOPS, type Stop } from "./worlds";

/**
 * The homepage as a world map.
 *
 * Same destinations as the nav, laid out as somewhere you move through
 * rather than a list you read. What makes the reference work is that
 * the map is a place: roads you are partway along, somewhere you have
 * been behind you and somewhere you have not ahead. So there is a
 * marker that stands on whatever you are pointing at, the roads are
 * drawn between the stops rather than implied, and the bar along the
 * bottom says where you are.
 *
 * Pointer and keyboard focus both move the marker, which is the whole
 * interaction and the reason this is a client component.
 *
 * LAYOUT. Cells, not guesses. A cell centre is a percentage of the
 * map box, worked out here from the grid in worlds.ts, so a road
 * always ends exactly on the panel it leads to. Percentages rather
 * than pixels so the whole map scales as one piece.
 */

/** Centre of a cell, as a percentage of the box. */
const cx = (col: number) => ((col - 0.5) / COLS) * 100;
const cy = (row: number) => ((row - 0.5) / ROWS) * 100;

export default function WorldMap() {
  // Nothing is current until somebody points at something. Starting
  // the marker on world 1 would claim progress nobody has made.
  const [at, setAt] = useState<Stop | null>(null);

  const stand = (s: Stop) => ({
    onMouseEnter: () => setAt(s),
    onFocus: () => setAt(s),
    onMouseLeave: () => setAt(null),
    onBlur: () => setAt(null),
  });

  return (
    <div className="whoa-smb-wrap">
      {/* The map is landscape, as the reference is, and does not
          reflow into a column: a world map that rearranges itself is
          a list. On a phone it pans instead, which is what you do
          with a map. tabIndex so the scroll container is reachable
          by keyboard and not just by dragging. */}
      <div
        className="whoa-smb-scroll"
        tabIndex={0}
        role="group"
        aria-label="World map. Scroll sideways on a narrow screen."
      >
        <div className="whoa-smb-frame">
          <div className="whoa-smb-field">
            {/* ───── Roads ───── */}
            {ROADS.map(([from, to], i) => {
              const [c1, r1] = from;
              const [c2, r2] = to;
              // A diagonal would quietly draw a rectangle instead of a
              // road, and on a map this busy nobody would find it.
              if (c1 !== c2 && r1 !== r2) return null;

              const horizontal = r1 === r2;
              const style = horizontal
                ? {
                    left: `${Math.min(cx(c1), cx(c2))}%`,
                    width: `${Math.abs(cx(c2) - cx(c1))}%`,
                    top: `${cy(r1)}%`,
                  }
                : {
                    top: `${Math.min(cy(r1), cy(r2))}%`,
                    height: `${Math.abs(cy(r2) - cy(r1))}%`,
                    left: `${cx(c1)}%`,
                  };

              return (
                <span
                  key={i}
                  aria-hidden
                  className={horizontal ? "whoa-smb-road-h" : "whoa-smb-road-v"}
                  style={style}
                >
                  {/* The orange dot every road carries at its middle,
                      which is what stops a long run reading as a pipe. */}
                  <span className="whoa-smb-dot" />
                </span>
              );
            })}

            {/* ───── Scenery ───── */}
            {SCENERY.map((s, i) => (
              <span
                key={i}
                aria-hidden
                className="whoa-smb-prop"
                style={{ left: `${cx(s.col)}%`, top: `${cy(s.row)}%` }}
              >
                <Prop kind={s.kind} />
              </span>
            ))}

            {/* ───── Where you are ───── */}
            <span
              aria-hidden
              className="whoa-smb-player"
              data-on={at ? "yes" : "no"}
              style={
                at
                  ? ({ left: `${cx(at.col)}%`, top: `${cy(at.row)}%` } as React.CSSProperties)
                  : undefined
              }
            />

            {/* ───── The stops ───── */}
            {STOPS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="whoa-smb-stop"
                data-kind={s.kind}
                style={{ left: `${cx(s.col)}%`, top: `${cy(s.row)}%` }}
                {...stand(s)}
              >
                {s.kind === "level" && (
                  <span className="whoa-smb-panel" aria-hidden>
                    {/* The little white wedge in the panel's corner,
                        which is the one detail that makes a black
                        square read as a Mario level. */}
                    <span className="whoa-smb-wedge" />
                    <span className="whoa-smb-num">{s.n}</span>
                  </span>
                )}
                {s.kind === "house" && <span className="whoa-smb-house" aria-hidden />}
                {s.kind === "castle" && <span className="whoa-smb-castle" aria-hidden />}
                {s.kind === "start" && (
                  <span className="whoa-smb-start" aria-hidden>
                    START
                  </span>
                )}

                {/* The real name, always on. A map where you have to
                    hover to learn where a door goes is a puzzle, and
                    this is still a way of getting to the shop. */}
                <span className="whoa-smb-label">{s.page}</span>
                <span className="sr-only">
                  {s.n ? ` — world ${s.n}, ` : " — "}
                  {s.world}. {s.blurb}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* The status bar. Says what the links already say, so it is
          hidden from screen readers rather than read out twice. */}
      <div aria-hidden className="whoa-smb-hud">
        <span className="whoa-smb-hud-cell">
          <b>WORLD</b>
          <span>{at ? (at.n ? `1-${at.n}` : "★") : "— ? —"}</span>
        </span>
        <span className="whoa-smb-hud-say">
          {at ? `${at.world}. ${at.blurb}` : "Pick somewhere."}
        </span>
        <span className="whoa-smb-hud-cell">
          <b>WHOA</b>
          <span>×&nbsp;∞</span>
        </span>
      </div>
    </div>
  );
}
