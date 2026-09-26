/**
 * Monthly commission periods, in Pacific time.
 *
 * A period is a calendar month: September means 1 Sept 00:00 to 30 Sept
 * 23:59:59.999, San Diego time. Paid on the 1st of the month after.
 *
 * Pacific, not UTC, and that is the whole reason this file exists. An
 * order placed at 6pm on 30 September is 01:00 on 1 October in UTC — so
 * bucketing on toISOString() would push the last seven hours of every
 * month into the next one's pay run. Every month would be slightly wrong
 * in a way that only shows up as an ambassador querying their total.
 */

const PT_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "2026-09" for an instant, in Pacific time. */
export function periodOf(iso: string | Date): string | null {
  const at = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const parts = PT_PARTS.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = get("year");
  const month = get("month");
  return year && month ? `${year}-${month}` : null;
}

/** The month that's due to be paid: the one that has ended. */
export function currentPayoutPeriod(now: Date = new Date()): string {
  const thisMonth = periodOf(now) ?? "";
  return previousPeriod(thisMonth);
}

export function previousPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

/** "September 2026" — for a heading, not for storage. */
export function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

/** The day a period is paid: the 1st of the month after it. */
export function payoutDueLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return "";
  const due = m === 12 ? new Date(Date.UTC(y + 1, 0, 1)) : new Date(Date.UTC(y, m, 1));
  return due.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

/** The last `count` completed months, newest first. */
export function recentPeriods(count = 12, now: Date = new Date()): string[] {
  const out: string[] = [];
  let period = currentPayoutPeriod(now);
  for (let i = 0; i < count; i += 1) {
    out.push(period);
    period = previousPeriod(period);
  }
  return out;
}
