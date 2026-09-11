import type { CSSProperties } from "react";
import { COMING_SOON_LABEL } from "@/lib/lockedRoutes";

/**
 * The padlock, on its own, for places that already say "coming soon" some
 * other way — a dock tab with no room for a second line, say.
 *
 * `currentColor` throughout so it takes the muted/accent colour of whatever
 * it sits in rather than carrying its own.
 */
export function LockIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Padlock + "Coming Soon!", the shared way of saying an area isn't open.
 *
 * Deliberately one component rather than the markup copied into each place
 * it's needed: the lock and the words are the signal, and a visitor who
 * meets it worded one way on the homepage and another in the nav learns
 * less from the second time than they should.
 *
 * Purely presentational — it says a thing is locked, it doesn't do the
 * locking. Whatever renders it is responsible for not being clickable.
 */
export default function ComingSoonBadge({
  className = "",
  style,
}: {
  className?: string;
  /** For the one caller that needs a drop shadow to stay legible over art. */
  style?: CSSProperties;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap text-[0.6rem] font-semibold tracking-[0.15em] uppercase ${className}`}
      style={style}
    >
      <LockIcon className="h-3 w-3 shrink-0" />
      {COMING_SOON_LABEL}
    </span>
  );
}
