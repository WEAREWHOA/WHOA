export default function CaterpillarIcon({ accent, label }: { accent: string; label: string }) {
  return (
    <div
      className="caterpillar-body relative flex w-32 flex-col items-center justify-center rounded-full px-4 py-4 sm:w-40 sm:py-5"
      style={{
        background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 65%, black))`,
        boxShadow: `0 10px 22px -8px color-mix(in srgb, ${accent} 70%, black)`,
      }}
    >
      <div className="caterpillar-segments pointer-events-none absolute inset-0 rounded-full" />

      <div className="pointer-events-none absolute -top-3.5 left-6 flex sm:left-7">
        <svg width="30" height="20" viewBox="0 0 30 20" className="overflow-visible" aria-hidden>
          <path d="M11 20 C 7 12, 4 7, 5 1" stroke="#241a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M18 20 C 19 11, 21 6, 26 1" stroke="#241a1f" strokeWidth="2" fill="none" strokeLinecap="round" />
          <circle cx="5" cy="1" r="2.2" fill="#241a1f" />
          <circle cx="26" cy="1" r="2.2" fill="#241a1f" />
        </svg>
      </div>

      <div className="pointer-events-none absolute left-4 top-3 sm:left-5 sm:top-3.5">
        <svg width="30" height="16" viewBox="0 0 30 16" aria-hidden>
          <circle cx="5" cy="6" r="5" fill="white" />
          <circle cx="6.4" cy="6" r="2.7" fill="#241a1f" />
          <circle cx="7.3" cy="4.4" r="0.9" fill="white" />
          <circle cx="19" cy="6" r="5" fill="white" />
          <circle cx="20.4" cy="6" r="2.7" fill="#241a1f" />
          <circle cx="21.3" cy="4.4" r="0.9" fill="white" />
          <path d="M7 13.5 Q 12 16.5 17 13.5" stroke="#241a1f" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      <span className="relative z-10 mt-5 text-center font-display text-[0.68rem] leading-tight tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] sm:text-xs">
        {label}
      </span>

      <div className="pointer-events-none absolute -bottom-1.5 left-1/2 flex w-[80%] -translate-x-1/2 justify-between">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className="caterpillar-leg h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5"
            style={{
              background: `color-mix(in srgb, ${accent} 55%, black)`,
              animationDelay: `${i * 0.09}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
