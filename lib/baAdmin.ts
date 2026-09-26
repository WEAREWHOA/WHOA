import { currentPayoutPeriod, isValidPeriod, periodOf } from "./baPeriods";
import { getSupabase } from "./supabase";
import { getTier } from "./tiers";
import type { TierId } from "./types";

/**
 * Every Brand Ambassador, their numbers, and what they're owed.
 *
 * "Owed" is the number this whole tab exists for, and until now it
 * couldn't be computed: the ambassadors table said where to pay someone
 * but nothing recorded that a payment had happened, so commission was a
 * lifetime total that only went up. Owed is earned minus paid.
 *
 * Money is in cents everywhere below. The orders table stores dollars as
 * numeric, so it's converted once on the way in rather than carried as a
 * float through half a dozen sums.
 */

export interface BaRow {
  code: string;
  name: string;
  email: string;
  instagram: string | null;
  joinedAt: string;
  tier: TierId;
  tierLabel: string;
  clicks: number;
  orderCount: number;
  salesCents: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
  payoutMethod: string | null;
  payoutDestination: string | null;
  lastOrderAt: string | null;
  lastPaidAt: string | null;

  // ── the selected pay period ────────────────────────────────────────
  // Lifetime figures above are for the leaderboard and tiers. These are
  // what the pay run acts on, and they're the only numbers anyone should
  // be moving money against.
  periodOrderCount: number;
  periodSalesCents: number;
  periodEarnedCents: number;
  /** The payout already recorded for this period, if there is one. */
  periodPaid: { amountCents: number; method: string; reference: string | null; paidAt: string } | null;
}

export interface BaOverview {
  ambassadors: number;
  selling: number;
  clicks: number;
  orderCount: number;
  salesCents: number;
  earnedCents: number;
  paidCents: number;
  owedCents: number;
  /** How many are owed anything at all, lifetime. */
  awaitingPayout: number;

  // ── the selected pay period ────────────────────────────────────────
  periodSalesCents: number;
  periodEarnedCents: number;
  /** Of that, already settled. */
  periodPaidCents: number;
  /** Still to send for this period — the number the pay run is for. */
  periodDueCents: number;
  /** How many people are in this run, and how many are still unpaid. */
  periodEarners: number;
  periodUnpaid: number;
}

export interface PayoutRecord {
  id: string;
  code: string;
  name: string;
  /** The month this settled, YYYY-MM. */
  period: string;
  amountCents: number;
  method: string;
  reference: string | null;
  note: string | null;
  paidAt: string;
  paidBy: string | null;
}

export interface BaAdminData {
  /** The month the pay run is for, as YYYY-MM. */
  period: string;
  overview: BaOverview;
  roster: BaRow[];
  recentPayouts: PayoutRecord[];
}

function dollarsToCents(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

async function rows<T>(table: string, columns: string): Promise<T[]> {
  try {
    const { data, error } = await getSupabase().from(table).select(columns);
    if (error) {
      // A missing table shouldn't blank the tab — that column reads zero
      // and the rest still works.
      console.error(`BA admin: failed to read ${table}:`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`BA admin: failed to read ${table}:`, err);
    return [];
  }
}

export async function getBaAdminData(requestedPeriod?: string): Promise<BaAdminData> {
  // Defaults to the month that has ended, because that's the one being
  // paid: on 1 October you settle September.
  const period =
    requestedPeriod && isValidPeriod(requestedPeriod) ? requestedPeriod : currentPayoutPeriod();

  const [accounts, links, orders, payouts] = await Promise.all([
    rows<{
      code: string; name: string; email: string; instagram: string | null;
      created_at: string; perm_ambassador: boolean; deleted_at: string | null;
      payout_method: string | null; payout_destination: string | null;
    }>("ambassadors",
       "code, name, email, instagram, created_at, perm_ambassador, deleted_at, payout_method, payout_destination"),
    rows<{ ambassador_code: string; clicks: number }>("links", "ambassador_code, clicks"),
    rows<{ ambassador_code: string; sale_amount: number; commission: number; order_date: string }>(
      "orders", "ambassador_code, sale_amount, commission, order_date"),
    rows<{
      id: string; ambassador_code: string; period: string; amount_cents: number; method: string;
      reference: string | null; note: string | null; paid_at: string; paid_by: string | null;
    }>("ambassador_payouts",
       "id, ambassador_code, period, amount_cents, method, reference, note, paid_at, paid_by"),
  ]);

  const clicksBy = new Map<string, number>();
  for (const link of links) {
    clicksBy.set(link.ambassador_code, (clicksBy.get(link.ambassador_code) ?? 0) + (link.clicks ?? 0));
  }

  interface Tally { count: number; sales: number; earned: number; last: string | null }
  const blank = (): Tally => ({ count: 0, sales: 0, earned: 0, last: null });
  const ordersBy = new Map<string, Tally>();
  const periodOrdersBy = new Map<string, Tally>();

  for (const order of orders) {
    const sale = dollarsToCents(order.sale_amount);
    const earned = dollarsToCents(order.commission);

    const t = ordersBy.get(order.ambassador_code) ?? blank();
    t.count += 1;
    t.sales += sale;
    t.earned += earned;
    if (!t.last || order.order_date > t.last) t.last = order.order_date;
    ordersBy.set(order.ambassador_code, t);

    // Pacific, not UTC: an order at 6pm on the 30th is the 1st in UTC,
    // so bucketing on the raw timestamp would move the last hours of
    // every month into the next month's pay run.
    if (periodOf(order.order_date) === period) {
      const p = periodOrdersBy.get(order.ambassador_code) ?? blank();
      p.count += 1;
      p.sales += sale;
      p.earned += earned;
      periodOrdersBy.set(order.ambassador_code, p);
    }
  }

  const periodPaidBy = new Map<string, BaRow["periodPaid"]>();
  for (const payout of payouts) {
    if (payout.period !== period) continue;
    periodPaidBy.set(payout.ambassador_code, {
      amountCents: payout.amount_cents ?? 0,
      method: payout.method,
      reference: payout.reference,
      paidAt: payout.paid_at,
    });
  }

  const paidBy = new Map<string, { total: number; last: string | null }>();
  for (const payout of payouts) {
    const p = paidBy.get(payout.ambassador_code) ?? { total: 0, last: null };
    p.total += payout.amount_cents ?? 0;
    if (!p.last || payout.paid_at > p.last) p.last = payout.paid_at;
    paidBy.set(payout.ambassador_code, p);
  }

  // Brand Ambassadors only — a plain customer account is not part of this
  // roster, and a deactivated one has left it.
  const roster: BaRow[] = accounts
    .filter((a) => a.perm_ambassador && !a.deleted_at)
    .map((a) => {
      const tally = ordersBy.get(a.code) ?? blank();
      const periodTally = periodOrdersBy.get(a.code) ?? blank();
      const paid = paidBy.get(a.code) ?? { total: 0, last: null };
      const tier = getTier(tally.count);
      return {
        code: a.code,
        name: a.name,
        email: a.email,
        instagram: a.instagram ?? null,
        joinedAt: a.created_at,
        tier: tier.id,
        tierLabel: tier.label,
        clicks: clicksBy.get(a.code) ?? 0,
        orderCount: tally.count,
        salesCents: tally.sales,
        earnedCents: tally.earned,
        paidCents: paid.total,
        // Clamped at zero: an overpayment is a real thing that happens,
        // and showing it as negative "owed" reads as the ambassador owing
        // WHOA money, which is not what it means.
        owedCents: Math.max(0, tally.earned - paid.total),
        payoutMethod: a.payout_method,
        payoutDestination: a.payout_destination,
        lastOrderAt: tally.last,
        lastPaidAt: paid.last,
        periodOrderCount: periodTally.count,
        periodSalesCents: periodTally.sales,
        periodEarnedCents: periodTally.earned,
        periodPaid: periodPaidBy.get(a.code) ?? null,
      };
    })
    .sort((a, b) => b.salesCents - a.salesCents || a.name.localeCompare(b.name));

  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]));

  const inRun = roster.filter((r) => r.periodEarnedCents > 0);

  return {
    period,
    roster,
    overview: {
      ambassadors: roster.length,
      selling: roster.filter((r) => r.orderCount > 0).length,
      clicks: roster.reduce((s, r) => s + r.clicks, 0),
      orderCount: roster.reduce((s, r) => s + r.orderCount, 0),
      salesCents: roster.reduce((s, r) => s + r.salesCents, 0),
      earnedCents: roster.reduce((s, r) => s + r.earnedCents, 0),
      paidCents: roster.reduce((s, r) => s + r.paidCents, 0),
      owedCents: roster.reduce((s, r) => s + r.owedCents, 0),
      awaitingPayout: roster.filter((r) => r.owedCents > 0).length,
      periodSalesCents: inRun.reduce((s, r) => s + r.periodSalesCents, 0),
      periodEarnedCents: inRun.reduce((s, r) => s + r.periodEarnedCents, 0),
      periodPaidCents: inRun.reduce((s, r) => s + (r.periodPaid?.amountCents ?? 0), 0),
      periodDueCents: inRun
        .filter((r) => !r.periodPaid)
        .reduce((s, r) => s + r.periodEarnedCents, 0),
      periodEarners: inRun.length,
      periodUnpaid: inRun.filter((r) => !r.periodPaid).length,
    },
    recentPayouts: payouts
      .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
      .slice(0, 25)
      .map((p) => ({
        id: p.id,
        code: p.ambassador_code,
        name: nameByCode.get(p.ambassador_code) ?? p.ambassador_code,
        period: p.period,
        amountCents: p.amount_cents,
        method: p.method,
        reference: p.reference,
        note: p.note,
        paidAt: p.paid_at,
        paidBy: p.paid_by,
      })),
  };
}

export interface RecordPayoutInput {
  code: string;
  /** The month being settled, YYYY-MM. */
  period: string;
  amountCents: number;
  method: string;
  reference?: string | null;
  note?: string | null;
  paidBy: string;
}

/**
 * Writes one payout against one month.
 *
 * A receipt, not a state change: nothing is overwritten, so the history
 * stays auditable. The unique index on (ambassador_code, period) is what
 * actually prevents double-paying — a second submission, two people
 * working the run at once, or a refreshed confirmation all land on it
 * rather than sending money twice.
 */
export async function recordPayout(
  input: RecordPayoutInput,
  // Injectable so the month-boundary rule can be tested at the boundary
  // rather than only whenever the suite happens to run.
  now: Date = new Date(),
): Promise<{ ok: boolean; error?: string }> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: "Pick an ambassador." };
  if (!isValidPeriod(input.period)) return { ok: false, error: "Pick a valid month." };
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }
  // Nobody should be able to pay a month that hasn't finished: the total
  // would still be moving underneath the payment.
  if (input.period >= (periodOf(now) ?? "")) {
    return { ok: false, error: "That month hasn't ended yet." };
  }
  const method = input.method.trim().slice(0, 40) || "other";

  try {
    const { error } = await getSupabase().from("ambassador_payouts").insert({
      ambassador_code: code,
      period: input.period,
      amount_cents: input.amountCents,
      method,
      reference: input.reference?.trim().slice(0, 200) || null,
      note: input.note?.trim().slice(0, 500) || null,
      paid_by: input.paidBy.trim().toUpperCase().slice(0, 40) || null,
    });
    if (error) {
      // 23505 is the unique violation: this month is already settled for
      // this person. Said plainly, because "try again" would be exactly
      // the wrong advice.
      if (error.code === "23505") {
        return { ok: false, error: "That month is already paid for this ambassador." };
      }
      console.error("Failed to record a payout:", error.message);
      return { ok: false, error: "Couldn't save that payout. Try again." };
    }
    return { ok: true };
  } catch (err) {
    console.error("Failed to record a payout:", err);
    return { ok: false, error: "Couldn't save that payout. Try again." };
  }
}

export interface PayRunResult {
  ok: boolean;
  /** How many payouts were written. */
  recorded: number;
  /** Total settled, in cents. */
  totalCents: number;
  /** Anyone skipped, and why — an empty list means a clean run. */
  skipped: { code: string; name: string; reason: string }[];
  error?: string;
}

/**
 * Settles a whole month at once: one payout per ambassador who earned in
 * that period and hasn't been paid for it.
 *
 * This is the automation. It does NOT move money — Venmo and Zelle have
 * no API to send from, so the transfers are still made by hand. What it
 * removes is the arithmetic and the bookkeeping, which is where the
 * mistakes actually happen: every amount comes straight from the orders
 * in that month, and every ambassador is either recorded or reported as
 * skipped. Nothing is silently missed.
 *
 * Idempotent by construction. Anyone already paid for the period is
 * skipped rather than paid again, and the unique index is the backstop
 * if two runs overlap.
 */
export async function recordPayRun(
  period: string,
  paidBy: string,
  now: Date = new Date(),
): Promise<PayRunResult> {
  if (!isValidPeriod(period)) {
    return { ok: false, recorded: 0, totalCents: 0, skipped: [], error: "Pick a valid month." };
  }
  if (period >= (periodOf(now) ?? "")) {
    return { ok: false, recorded: 0, totalCents: 0, skipped: [], error: "That month hasn't ended yet." };
  }

  const data = await getBaAdminData(period);
  const due = data.roster.filter((r) => r.periodEarnedCents > 0 && !r.periodPaid);

  const skipped: PayRunResult["skipped"] = data.roster
    .filter((r) => r.periodEarnedCents > 0 && r.periodPaid)
    .map((r) => ({ code: r.code, name: r.name, reason: "already paid for this month" }));

  if (!due.length) {
    return { ok: true, recorded: 0, totalCents: 0, skipped };
  }

  const author = paidBy.trim().toUpperCase().slice(0, 40) || null;
  const payable = due.filter((r) => {
    // Someone with no payout details can't be paid, and recording one
    // would assert a transfer that can't have happened.
    if (!r.payoutMethod || !r.payoutDestination) {
      skipped.push({ code: r.code, name: r.name, reason: "no payout details on their account" });
      return false;
    }
    return true;
  });

  if (!payable.length) return { ok: true, recorded: 0, totalCents: 0, skipped };

  try {
    const { data: inserted, error } = await getSupabase()
      .from("ambassador_payouts")
      .insert(
        payable.map((r) => ({
          ambassador_code: r.code,
          period,
          amount_cents: r.periodEarnedCents,
          method: r.payoutMethod,
          note: `Monthly pay run for ${period}`,
          paid_by: author,
        })),
      )
      .select("amount_cents");

    if (error) {
      console.error("Pay run failed:", error.message);
      return {
        ok: false, recorded: 0, totalCents: 0, skipped,
        error: "Couldn't record the pay run. Nothing was saved — try again.",
      };
    }

    const written = inserted ?? [];
    return {
      ok: true,
      recorded: written.length,
      totalCents: written.reduce((sum, row) => sum + ((row.amount_cents as number) ?? 0), 0),
      skipped,
    };
  } catch (err) {
    console.error("Pay run failed:", err);
    return {
      ok: false, recorded: 0, totalCents: 0, skipped,
      error: "Couldn't record the pay run. Nothing was saved — try again.",
    };
  }
}
