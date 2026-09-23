"use client";

import Link from "next/link";
import { VILLAGE_ZONES } from "@/lib/ssbdExperience";

/**
 * The village, top-down.
 *
 * Tap a hut to enter it — no walking, no keyboard. Most people reach this
 * from a phone at a festival, where a d-pad on a touchscreen is a worse
 * experience than a target you can hit with a thumb.
 *
 * Drawn as one SVG rather than images: it scales to any screen without a
 * download, and every hut is a real link underneath, so it works the same
 * whether it's tapped, clicked or reached with a keyboard.
 */
export default function Village({ entered }: { entered: boolean }) {
  return (
    <div className={`go-village ${entered ? "go-village-in" : ""}`}>
      <svg viewBox="0 0 1000 800" className="go-map" role="presentation">
        <defs>
          <radialGradient id="go-ground" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#2a1c3d" />
            <stop offset="60%" stopColor="#170f24" />
            <stop offset="100%" stopColor="#0c0812" />
          </radialGradient>
          <radialGradient id="go-fire" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd08a" />
            <stop offset="45%" stopColor="#ff7a00" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ff2f1a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="1000" height="800" fill="url(#go-ground)" />

        {/* Paths between the huts, drawn first so everything sits on them. */}
        <g stroke="rgba(247,240,230,0.12)" strokeWidth="26" fill="none" strokeLinecap="round">
          <path d="M250,300 Q500,340 750,300" />
          <path d="M250,510 Q500,470 750,510" />
          <path d="M300,300 Q500,405 300,510" />
          <path d="M700,300 Q500,405 700,510" />
        </g>

        {/* The fire in the middle of the village. */}
        <circle cx="500" cy="405" r="120" fill="url(#go-fire)" className="go-fire" />
        <circle cx="500" cy="405" r="16" fill="#ffb800" opacity="0.9" />

        {VILLAGE_ZONES.map((zone) => (
          <Link key={zone.id} href={zone.href} aria-label={zone.name}>
            <g className="go-hut">
              {/* Glow behind the hut, so a tap target reads as alive. */}
              <circle cx={zone.x} cy={zone.y - 10} r="96" fill={zone.accent} opacity="0.12" className="go-hut-glow" />

              {/* Roof */}
              <path
                d={`M${zone.x - 78},${zone.y - 12} L${zone.x},${zone.y - 82} L${zone.x + 78},${zone.y - 12} Z`}
                fill={zone.accent}
              />
              {/* Body */}
              <rect x={zone.x - 58} y={zone.y - 12} width="116" height="70" rx="6" fill="#1d1529" />
              {/* Doorway */}
              <path
                d={`M${zone.x - 20},${zone.y + 58} L${zone.x - 20},${zone.y + 16} Q${zone.x},${zone.y - 2} ${zone.x + 20},${zone.y + 16} L${zone.x + 20},${zone.y + 58} Z`}
                fill={zone.accent}
                opacity="0.35"
              />
              {/* Torches either side of the door */}
              <circle cx={zone.x - 44} cy={zone.y + 20} r="6" fill="#ffb800" className="go-torch" />
              <circle cx={zone.x + 44} cy={zone.y + 20} r="6" fill="#ffb800" className="go-torch" />

              <text
                x={zone.x}
                y={zone.y + 96}
                textAnchor="middle"
                className="go-hut-label"
                fill="#f7f0e6"
              >
                {zone.name}
              </text>
            </g>
          </Link>
        ))}
      </svg>

      {/* The same four places as cards. On a phone this is what most
          thumbs actually use, and it gives every hut a readable line of
          explanation the map has no room for. */}
      <div className="go-zone-cards">
        {VILLAGE_ZONES.map((zone) => (
          <Link key={zone.id} href={zone.href} className="go-zone-card" style={{ borderColor: `${zone.accent}55` }}>
            <span className="go-zone-name" style={{ color: zone.accent }}>
              {zone.name}
            </span>
            <span className="go-zone-blurb">{zone.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
