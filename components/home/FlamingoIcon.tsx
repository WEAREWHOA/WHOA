export default function FlamingoIcon({ accent, label }: { accent: string; label: string }) {
  return (
    <div className="relative flex flex-col items-center" style={{ width: "clamp(96px, 11vw, 156px)" }}>
      <svg
        viewBox="0 0 160 210"
        role="img"
        aria-label={label}
        className="w-full drop-shadow-[0_12px_20px_rgba(0,0,0,0.5)] transition-[filter] duration-300 group-hover:brightness-125"
      >
        <path
          d="M78 150 L70 195 L54 199"
          fill="none"
          stroke="#c93b7a"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M96 148 L108 172 L120 163"
          fill="none"
          stroke="#c93b7a"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="flamingo-leg"
        />
        <path d="M130 118 L150 108 L134 132 Z" fill={accent} opacity="0.75" />
        <ellipse cx="92" cy="122" rx="46" ry="33" fill={accent} />
        <path
          d="M60 108 C 85 100, 120 105, 132 128 C 108 138, 74 136, 58 122 Z"
          fill="black"
          opacity="0.12"
        />
        <path
          d="M60 96 C 30 74, 26 34, 55 16"
          fill="none"
          stroke={accent}
          strokeWidth="15"
          strokeLinecap="round"
        />
        <circle cx="55" cy="15" r="11" fill={accent} />
        <path d="M45 11 L27 19 L45 23 Z" fill="#241a1f" />
        <circle cx="51" cy="12" r="1.7" fill="#241a1f" />
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-[54%] w-[72%] -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="font-display text-[clamp(0.5rem,1.05vw,0.8rem)] leading-tight tracking-wide text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]">
          {label}
        </span>
      </div>
    </div>
  );
}
