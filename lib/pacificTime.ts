/**
 * Wall-clock time in San Diego, converted to a real instant.
 *
 * A `datetime-local` input has no time zone in it: "2026-10-08T14:00" is
 * two o'clock wherever the person typing it is standing, which here is
 * always Pacific. Turning that into a UTC instant needs the offset that
 * applied ON THAT DATE, and Pacific has two: -08:00 in winter, -07:00 in
 * summer.
 *
 * This used to be written as a hardcoded "-08:00". For seven months of
 * the year that is an hour wrong in the worst direction: a post
 * published at two o'clock was stored as three, so it counted as
 * scheduled rather than published and stayed invisible for an hour.
 * Worse, the editor formatted the stored value back through Intl, which
 * is correct, so the field showed the right time while the parse was
 * wrong. Something that round-trips wrongly but displays rightly is
 * nearly impossible to catch by looking.
 */

/** What a given instant reads as on the clock in `timeZone`, as if UTC. */
function wallClockAsUtc(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  // hourCycle h23 still renders midnight as 24 in some engines.
  const hour = get("hour") % 24;
  return Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
}

/**
 * "2026-10-08T14:00" in Pacific to the instant it names.
 *
 * Solved by iteration rather than by looking an offset up: guess that the
 * wall time is UTC, see what that instant actually reads as in Pacific,
 * and correct by the difference. Twice, because a single pass is wrong
 * for the two hours a year when the correction itself crosses a DST
 * boundary.
 *
 * Returns null for anything unparseable, so a caller can fall back
 * rather than store a silent Invalid Date.
 */
export function pacificWallTimeToUtc(local: string, timeZone = "America/Los_Angeles"): Date | null {
  // Shape-checked before parsing, because V8's Date parser is lenient to
  // the point of dangerous: new Date("not a date:00Z") is not an Invalid
  // Date, it is the first of January 2000. A NaN check alone would have
  // let that through and silently published a post twenty-six years ago.
  const value = local.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;

  const target = new Date(`${value}:00Z`);
  if (Number.isNaN(target.getTime())) return null;

  let instant = target;
  for (let i = 0; i < 2; i++) {
    const drift = wallClockAsUtc(instant, timeZone) - target.getTime();
    if (drift === 0) break;
    instant = new Date(instant.getTime() - drift);
  }
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** The reverse: an instant as a `datetime-local` value in Pacific. */
export function utcToPacificWallTime(iso: string | null, timeZone = "America/Los_Angeles"): string {
  if (!iso) return "";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return new Date(wallClockAsUtc(at, timeZone)).toISOString().slice(0, 16);
}
