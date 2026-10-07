/**
 * The trip so far, as a hand-drawn-style map: every place the timeline
 * mentions, joined in the order WHOA first got there, starting and ending
 * in San Diego. Deliberately not to scale (Miami and El Salvador would
 * otherwise be off the edge of a phone), and deliberately plain SVG: no
 * map tiles, no script, and every pin is a real link to its year below.
 */

interface Pin {
  x: number;
  y: number;
  name: string;
  years: string[];
  // Where the label sits relative to the pin.
  label: "right" | "below";
  home?: boolean;
}

const PINS: Pin[] = [
  { x: 115, y: 185, name: "San Diego", years: ["2015", "2020", "2023"], label: "right" },
  { x: 78, y: 105, name: "Laguna Beach", years: ["2018", "2021"], label: "right" },
  { x: 125, y: 50, name: "SSBD Festival", years: ["2022", "2026"], label: "right" },
  { x: 355, y: 95, name: "Miami", years: ["2022"], label: "below" },
  { x: 270, y: 255, name: "El Salvador", years: ["2024"], label: "right" },
  { x: 82, y: 225, name: "WHOADEGA · OB", years: ["2025"], label: "right", home: true },
];

// San Diego → Laguna → the festival → Miami → El Salvador → home to OB.
const ROUTE = "M115 185 Q 60 150 78 105 Q 95 60 125 50 Q 250 10 355 95 Q 360 220 270 255 Q 170 290 82 225";

const short = (year: string) => `'${year.slice(2)}`;

export default function HistoryMap() {
  return (
    <figure className="card-surface relative mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl p-3 sm:p-5">
      <svg
        viewBox="0 0 400 300"
        className="h-auto w-full"
        role="group"
        aria-label="Map of the places in WHOA's history: San Diego, Laguna Beach, the Same Same But Different festival, Miami, El Salvador and the WHOADEGA in Ocean Beach"
      >
        <defs>
          <linearGradient id="history-route" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff2fb0" />
            <stop offset="35%" stopColor="#7b2ff7" />
            <stop offset="65%" stopColor="#29e6ff" />
            <stop offset="100%" stopColor="#ffb800" />
          </linearGradient>
          <radialGradient id="history-glow">
            <stop offset="0%" stopColor="#ff7a00" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ff7a00" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* The Pacific, west of a loose coastline. */}
        <path
          d="M0 0 L30 0 C 50 50, 62 90, 66 115 S 72 190, 74 215 S 68 275, 62 300 L0 300 Z"
          fill="#29e6ff"
          fillOpacity="0.07"
        />
        <path
          d="M30 0 C 50 50, 62 90, 66 115 S 72 190, 74 215 S 68 275, 62 300"
          fill="none"
          stroke="#29e6ff"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <text
          x="22"
          y="160"
          transform="rotate(-90 22 160)"
          textAnchor="middle"
          className="font-display"
          fontSize="12"
          letterSpacing="3"
          fill="#29e6ff"
          fillOpacity="0.5"
        >
          PACIFIC
        </text>

        <path
          d={ROUTE}
          fill="none"
          stroke="url(#history-route)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 9"
          className="history-route"
        />

        {PINS.map((pin) => {
          const labelX = pin.label === "right" ? pin.x + 13 : pin.x;
          const labelY = pin.label === "right" ? pin.y - 1 : pin.y + 24;
          const anchor = pin.label === "right" ? "start" : "middle";
          return (
            <a key={pin.name} href={`#y${pin.years[0]}`} className="history-pin">
              <title>{`${pin.name}: ${pin.years.join(", ")}`}</title>
              <circle cx={pin.x} cy={pin.y} r="18" fill="url(#history-glow)" className="history-pin-pulse" />
              {pin.home ? (
                <path
                  d={`M${pin.x} ${pin.y - 9} L${pin.x + 2.6} ${pin.y - 2.6} L${pin.x + 9} ${pin.y} L${pin.x + 2.6} ${pin.y + 2.6} L${pin.x} ${pin.y + 9} L${pin.x - 2.6} ${pin.y + 2.6} L${pin.x - 9} ${pin.y} L${pin.x - 2.6} ${pin.y - 2.6} Z`}
                  fill="#ffb800"
                />
              ) : (
                <circle cx={pin.x} cy={pin.y} r="6" fill="#ff7a00" stroke="#0a0806" strokeWidth="2" />
              )}
              <text x={labelX} y={labelY} textAnchor={anchor} fontSize="14" letterSpacing="0.5" className="font-display" fill="#f7f0e6">
                {pin.name}
              </text>
              <text x={labelX} y={labelY + 14} textAnchor={anchor} fontSize="11" fontWeight="600" fill="#ffb800">
                {pin.years.map(short).join(" · ")}
              </text>
            </a>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-white/50">
        The WHOA trip so far. Not to scale — tap a pin to jump to that year.
      </figcaption>
    </figure>
  );
}
