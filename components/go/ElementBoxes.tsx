"use client";

import Link from "next/link";
import { EXPERIENCE_DOORS, type Element } from "@/lib/ssbdExperience";

/**
 * Each element gets its own moving background, drawn in SVG so it scales
 * and costs nothing to load. They're deliberately different shapes of
 * motion rather than the same animation in four colours — fire climbs,
 * water rolls, air drifts across, earth pushes up from below.
 */
function ElementArt({ element }: { element: Element }) {
  if (element === "fire") {
    return (
      <svg viewBox="0 0 200 200" className="go-art" preserveAspectRatio="xMidYMax slice" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            className="go-flame"
            style={{ animationDelay: `${i * 0.45}s` }}
            d={`M${28 + i * 36},200 Q${16 + i * 36},150 ${34 + i * 36},124 Q${44 + i * 36},152 ${40 + i * 36},200 Z`}
            fill="currentColor"
          />
        ))}
      </svg>
    );
  }

  if (element === "water") {
    return (
      <svg viewBox="0 0 200 200" className="go-art" preserveAspectRatio="xMidYMax slice" aria-hidden>
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            className="go-wave"
            style={{ animationDelay: `${i * 1.1}s`, opacity: 0.5 - i * 0.12 }}
            d="M-100,150 q50,-22 100,0 t100,0 t100,0 t100,0 V200 H-100 Z"
            fill="currentColor"
          />
        ))}
      </svg>
    );
  }

  if (element === "air") {
    return (
      <svg viewBox="0 0 200 200" className="go-art" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            className="go-gust"
            style={{ animationDelay: `${i * 0.9}s` }}
            d={`M-60,${48 + i * 34} q40,-14 80,0 t80,0`}
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </svg>
    );
  }

  // earth
  return (
    <svg viewBox="0 0 200 200" className="go-art" preserveAspectRatio="xMidYMax slice" aria-hidden>
      {[0, 1, 2].map((i) => (
        <polygon
          key={i}
          className="go-peak"
          style={{ animationDelay: `${i * 0.8}s` }}
          points={`${10 + i * 62},200 ${58 + i * 62},${128 - i * 14} ${106 + i * 62},200`}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

export default function ElementBoxes() {
  return (
    <div className="go-boxes">
      {EXPERIENCE_DOORS.map((door) => (
        <Link
          key={door.id}
          href={door.href}
          className={`go-box go-box-${door.element}`}
          style={
            {
              "--door": door.accent,
              "--door-deep": door.accentDeep,
            } as React.CSSProperties
          }
        >
          <span className="go-box-art" style={{ color: door.accent }}>
            <ElementArt element={door.element} />
          </span>

          <span className="go-box-body">
            <span className="go-box-element">{door.element}</span>
            <span className="font-display go-box-name">{door.name}</span>
            <span className="go-box-blurb">{door.blurb}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
