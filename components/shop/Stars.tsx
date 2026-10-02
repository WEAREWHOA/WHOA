/**
 * A star rating, drawn rather than typed.
 *
 * Two rows of the same five stars, one dim and one lit, with the lit row
 * clipped to the fraction earned. That renders 4.3 as four stars and a
 * third rather than rounding it to something the number next to it
 * contradicts.
 *
 * No "use client": it is a drawing, so it belongs in the server HTML
 * where a crawler reads it alongside the markup.
 */
export default function Stars({
  value,
  size = "md",
  className = "",
}: {
  /** 0 to 5. Anything outside is clamped rather than overflowing. */
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const percent = (clamped / 5) * 100;
  const box = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4";

  const row = (lit: boolean) => (
    <span className={`flex w-max gap-0.5 ${lit ? "text-flame-2" : "text-border-strong"}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor" className={box} aria-hidden="true">
          <path d="M10 1.6l2.47 5.33 5.53.66-4.08 3.9 1.08 5.5L10 14.2l-5 2.79 1.08-5.5L2 7.59l5.53-.66L10 1.6Z" />
        </svg>
      ))}
    </span>
  );

  return (
    <span
      className={`relative inline-block align-middle ${className}`}
      role="img"
      aria-label={`${clamped} out of 5 stars`}
    >
      {row(false)}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        {row(true)}
      </span>
    </span>
  );
}
