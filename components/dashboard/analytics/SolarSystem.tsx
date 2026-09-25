"use client";

import { useState } from "react";
import type { JourneyMap } from "@/lib/journeys";

/**
 * The journey map, drawn as a system.
 *
 * The sun is the site. The inner ring is where people actually land and
 * move between; the outer ring is where they came from, off-site. An arc
 * from an outer body to an inner one is a real count of sessions that
 * made that jump, and its weight is that count.
 *
 * Colour carries the channel *family*, not the individual channel: there
 * are more channels than a categorical palette can separate, and cycling
 * hues past the validated set would invent differences the eye can't
 * trust. Each body is direct-labelled, so identity never rests on colour
 * alone, and the table underneath is the same data for anyone who'd
 * rather read it than orbit it.
 *
 * Every coordinate is rounded to 2dp. Math.cos and Math.sin aren't
 * required to be correctly rounded, so Node and the browser can disagree
 * in the last digit and trip a hydration mismatch on an SSR'd page.
 */

const GROUP_SERIES: Record<string, string> = {
  social: "var(--an-series-5)",
  search: "var(--an-series-1)",
  direct: "var(--an-series-3)",
  print: "var(--an-series-4)",
  email: "var(--an-series-7)",
  referral: "var(--an-series-2)",
  paid: "var(--an-series-8)",
};

const GROUP_LABEL: Record<string, string> = {
  social: "Social",
  search: "Search",
  direct: "Direct",
  print: "QR / print",
  email: "Email",
  referral: "Referral",
  paid: "Paid",
};

const SIZE = 760;
const CENTER = SIZE / 2;
const INNER_ORBIT = 158;
const OUTER_ORBIT = 292;

function pointOn(radius: number, index: number, total: number) {
  // Start at the top and go clockwise, so the biggest body (index 0) is
  // always at 12 o'clock and the layout doesn't appear to rotate as the
  // data changes.
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return {
    x: Number((CENTER + Math.cos(angle) * radius).toFixed(2)),
    y: Number((CENTER + Math.sin(angle) * radius).toFixed(2)),
    angle,
  };
}

function shortPath(path: string): string {
  if (path === "/") return "home";
  const trimmed = path.replace(/^\//, "");
  return trimmed.length > 16 ? `${trimmed.slice(0, 15)}…` : trimmed;
}

export default function SolarSystem({ map }: { map: JourneyMap }) {
  const [focus, setFocus] = useState<string | null>(null);

  if (!map.totalSessions) {
    return (
      <p className="an-empty">
        No journeys recorded yet — this fills in as visits come through.
      </p>
    );
  }

  const pages = map.pages.slice(0, 8);
  const channels = map.channels.slice(0, 10);

  const pagePos = new Map(
    pages.map((page, i) => [page.path, pointOn(INNER_ORBIT, i, pages.length)]),
  );
  const channelPos = new Map(
    channels.map((channel, i) => [channel.id, pointOn(OUTER_ORBIT, i, channels.length)]),
  );

  const maxPage = Math.max(...pages.map((p) => p.sessions), 1);
  const maxChannel = Math.max(...channels.map((c) => c.sessions), 1);
  const maxFlow = Math.max(...map.inbound.map((f) => f.sessions), 1);
  const maxStep = Math.max(...map.steps.map((s) => s.sessions), 1);

  const groups = [...new Set(channels.map((c) => c.group))];
  const focused = channels.find((c) => c.id === focus) ?? null;

  return (
    <div>
      <div className="an-plot-head">
        <span className="an-plot-value">
          {(focused ? focused.sessions : map.totalSessions).toLocaleString()}
        </span>
        <span className="an-plot-label">
          {focused
            ? `sessions from ${focused.label}${focused.topLanding ? ` · mostly landing on ${focused.topLanding}` : ""}`
            : "sessions in this window · tap a source to trace it"}
        </span>
      </div>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="an-solar" role="img"
        aria-label="Journey map: traffic sources orbiting the pages they land on">
        {/* Orbit guides — recessive, they're scaffolding not data. */}
        <circle cx={CENTER} cy={CENTER} r={INNER_ORBIT} className="an-orbit" />
        <circle cx={CENTER} cy={CENTER} r={OUTER_ORBIT} className="an-orbit" />

        {/* Page-to-page steps, inside the system. */}
        {map.steps.map((step) => {
          const from = pagePos.get(step.from);
          const to = pagePos.get(step.to);
          if (!from || !to || step.from === step.to) return null;
          const dim = focus !== null;
          return (
            <path
              key={`${step.from}->${step.to}`}
              d={`M${from.x},${from.y} Q${CENTER},${CENTER} ${to.x},${to.y}`}
              className={`an-step ${dim ? "an-faded" : ""}`}
              strokeWidth={Number((1 + (step.sessions / maxStep) * 3).toFixed(2))}
            />
          );
        })}

        {/* Inbound arcs: a source to the page it lands on. */}
        {map.inbound.map((flow) => {
          const from = channelPos.get(flow.from);
          const to = pagePos.get(flow.to);
          if (!from || !to) return null;
          const active = focus === null || focus === flow.from;
          const channel = channels.find((c) => c.id === flow.from);
          return (
            <path
              key={`${flow.from}->${flow.to}`}
              d={`M${from.x},${from.y} Q${CENTER},${CENTER} ${to.x},${to.y}`}
              className={`an-arc ${active ? "" : "an-faded"}`}
              stroke={GROUP_SERIES[channel?.group ?? "direct"]}
              strokeWidth={Number((1.2 + (flow.sessions / maxFlow) * 4).toFixed(2))}
            />
          );
        })}

        {/* The sun. */}
        <circle cx={CENTER} cy={CENTER} r={44} className="an-sun" />
        <text x={CENTER} y={CENTER - 2} className="an-sun-label">WHOA</text>
        <text x={CENTER} y={CENTER + 15} className="an-sun-sub">
          {map.totalSessions.toLocaleString()}
        </text>

        {/* Inner ring: pages. Neutral, so the channel hues stay readable. */}
        {pages.map((page) => {
          const pos = pagePos.get(page.path);
          if (!pos) return null;
          const r = 10 + (page.sessions / maxPage) * 16;
          return (
            <g key={page.path} className="an-body">
              <circle cx={pos.x} cy={pos.y} r={Number(r.toFixed(2))} className="an-planet" />
              <text
                x={pos.x}
                y={Number((pos.y + r + 14).toFixed(2))}
                className="an-body-label"
              >
                {shortPath(page.path)}
              </text>
              <title>{`${page.path} — ${page.sessions} sessions, ${page.entries} arrived here first`}</title>
            </g>
          );
        })}

        {/* Outer ring: where they came from. */}
        {channels.map((channel) => {
          const pos = channelPos.get(channel.id);
          if (!pos) return null;
          const r = 12 + (channel.sessions / maxChannel) * 20;
          const active = focus === null || focus === channel.id;
          return (
            <g
              key={channel.id}
              className={`an-body an-body-tap ${active ? "" : "an-faded"}`}
              onClick={() => setFocus(focus === channel.id ? null : channel.id)}
              onMouseEnter={() => setFocus(channel.id)}
              onMouseLeave={() => setFocus(null)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={Number(r.toFixed(2))}
                className="an-star"
                fill={GROUP_SERIES[channel.group]}
              />
              <text
                x={pos.x}
                y={Number((pos.y + r + 15).toFixed(2))}
                className="an-body-label an-body-label-bright"
              >
                {channel.label}
              </text>
              <title>
                {`${channel.label} — ${channel.sessions} sessions, ${channel.converted} reached an outcome`}
              </title>
            </g>
          );
        })}
      </svg>

      <ul className="an-legend">
        {groups.map((group) => (
          <li key={group}>
            <span className="an-swatch" style={{ background: GROUP_SERIES[group] }} />
            {GROUP_LABEL[group] ?? group}
          </li>
        ))}
      </ul>

      {/* The same data, readable. Not a fallback — some questions are
          faster to answer in a table than in an orbit. */}
      <table className="an-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Sessions</th>
            <th>Went deeper</th>
            <th>Reached an outcome</th>
            <th>Usually lands on</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((channel) => (
            <tr key={channel.id} className={focus === channel.id ? "an-row-on" : ""}>
              <td>
                <span className="an-swatch" style={{ background: GROUP_SERIES[channel.group] }} />
                {channel.label}
              </td>
              <td>{channel.sessions.toLocaleString()}</td>
              <td>
                {channel.sessions
                  ? `${Math.round((channel.engaged / channel.sessions) * 100)}%`
                  : "—"}
              </td>
              <td>
                {channel.sessions
                  ? `${Math.round((channel.converted / channel.sessions) * 100)}%`
                  : "—"}
              </td>
              <td className="an-table-path">{channel.topLanding ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
