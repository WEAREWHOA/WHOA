import type { Square } from "square";

import { getSquare } from "@/lib/square";
import { getSupabase } from "@/lib/supabase";
import { SHIPPING_UID } from "@/lib/checkoutOrder";
import { periodOf } from "@/lib/baPeriods";
import { commissionForOrder } from "@/lib/tiers";

/**
 * Putting historical commission onto the current rule: post-promo,
 * pre-tax, excluding shipping.
 *
 * Every row in `orders` was written at charge time from whatever the rule
 * was that day. Early rows earned on tax; rows after shipping went live
 * earned on postage too. Neither figure is in the table — `orders` keeps
 * only the derived `sale_amount` and `commission` — so the real numbers
 * have to come back from Square, which has the order it actually charged.
 *
 * Square is the source of truth here, and the recomputation is
 * deterministic, so this converges: running it twice changes nothing the
 * second time, and a row already correct is left alone rather than
 * rewritten with the same value.
 */

/** Square's batch endpoint takes 100 ids per call. */
const BATCH_SIZE = 100;

/** Rows written by checkoutAction carry the Square order id behind this. */
const SQUARE_ID_PREFIX = "sq_";

export interface CommissionFix {
  id: string;
  ambassadorCode: string;
  customer: string;
  orderDate: string;
  /** The month this order belongs to, Pacific — the pay run it was in. */
  period: string | null;
  oldSaleCents: number;
  oldCommissionCents: number;
  newSaleCents: number;
  newCommissionCents: number;
  /** New minus old. Negative means the ambassador was over-credited. */
  deltaCommissionCents: number;
  /** What came off: shown so a change can be explained, not just seen. */
  taxCents: number;
  shippingCents: number;
  /** True when that ambassador's month has already been paid out. */
  alreadyPaid: boolean;
}

export interface SkippedOrder {
  id: string;
  ambassadorCode: string;
  reason: string;
}

export interface BackfillReport {
  ok: boolean;
  error?: string;
  /** True when the changes below were written, false for a preview. */
  applied: boolean;
  checked: number;
  unchanged: number;
  changes: CommissionFix[];
  skipped: SkippedOrder[];
  /** Sum of the deltas. Negative means commission owed goes down. */
  deltaCommissionCents: number;
  /** Months already settled whose totals this moves — no payout is
   *  rewritten, so these are for a human to deal with. */
  settledPeriods: { ambassadorCode: string; period: string; deltaCommissionCents: number }[];
}

interface OrderRow {
  id: string;
  ambassador_code: string;
  customer: string;
  order_date: string;
  sale_amount: number;
  commission: number;
}

function dollarsToCents(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function moneyCents(money: { amount?: bigint | null } | null | undefined): number {
  return money?.amount == null ? 0 : Number(money.amount);
}

/**
 * What WHOA charged for postage on this order.
 *
 * Only our own shipping charge counts. Reading `totalServiceChargeMoney`
 * would sweep in anything else Square is configured to add, and a service
 * charge that isn't postage may well be revenue an ambassador earns on.
 */
function shippingCentsOf(order: Square.Order): number {
  const charges = order.serviceCharges ?? [];
  return charges
    .filter((c) => c.uid === SHIPPING_UID)
    .reduce((sum, c) => sum + moneyCents(c.amountMoney ?? c.totalMoney), 0);
}

async function fetchSquareOrders(ids: string[]): Promise<Map<string, Square.Order>> {
  const square = getSquare();
  const byId = new Map<string, Square.Order>();

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const slice = ids.slice(i, i + BATCH_SIZE);
    // Square omits ids it can't find rather than erroring, so a deleted
    // or foreign order simply doesn't come back and is reported as a skip.
    const response = await square.orders.batchGet({ orderIds: slice });
    for (const order of response.orders ?? []) {
      if (order.id) byId.set(order.id, order);
    }
  }

  return byId;
}

/**
 * Work out every correction, and optionally write them.
 *
 * The preview and the apply run exactly the same computation — the only
 * difference is whether the updates are sent — so what someone approves
 * is what happens.
 */
async function runBackfill(apply: boolean): Promise<BackfillReport> {
  const empty: BackfillReport = {
    ok: true,
    applied: apply,
    checked: 0,
    unchanged: 0,
    changes: [],
    skipped: [],
    deltaCommissionCents: 0,
    settledPeriods: [],
  };

  const supabase = getSupabase();

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, ambassador_code, customer, order_date, sale_amount, commission");
  if (orderError) {
    return { ...empty, ok: false, error: `Couldn't read orders: ${orderError.message}` };
  }
  const rows = (orderData ?? []) as OrderRow[];
  if (rows.length === 0) return empty;

  const { data: payoutData, error: payoutError } = await supabase
    .from("ambassador_payouts")
    .select("ambassador_code, period");
  if (payoutError) {
    // Without this the report can't say which months are already settled,
    // and settling a month is the thing that makes a correction awkward —
    // so this is a hard stop rather than a silent gap.
    return { ...empty, ok: false, error: `Couldn't read payouts: ${payoutError.message}` };
  }
  const settled = new Set(
    (payoutData ?? []).map((p) => `${(p as { ambassador_code: string }).ambassador_code}:${(p as { period: string }).period}`),
  );

  const skipped: SkippedOrder[] = [];
  const squareRows: OrderRow[] = [];
  for (const row of rows) {
    if (!row.id?.startsWith(SQUARE_ID_PREFIX)) {
      // Seed and demo rows, and anything entered by hand. There is no
      // Square order to read a tax figure off, so there is nothing to
      // recompute from — guessing would be worse than leaving it.
      skipped.push({ id: row.id, ambassadorCode: row.ambassador_code, reason: "Not a Square order" });
      continue;
    }
    squareRows.push(row);
  }

  let squareOrders: Map<string, Square.Order>;
  try {
    squareOrders = await fetchSquareOrders(squareRows.map((r) => r.id.slice(SQUARE_ID_PREFIX.length)));
  } catch (err) {
    console.error("Commission backfill: Square lookup failed", err);
    return { ...empty, ok: false, error: "Couldn't reach Square to read the original orders." };
  }

  const changes: CommissionFix[] = [];
  let unchanged = 0;

  for (const row of squareRows) {
    const order = squareOrders.get(row.id.slice(SQUARE_ID_PREFIX.length));
    if (!order) {
      skipped.push({ id: row.id, ambassadorCode: row.ambassador_code, reason: "Not found in Square" });
      continue;
    }
    if (order.totalMoney?.amount == null) {
      skipped.push({ id: row.id, ambassadorCode: row.ambassador_code, reason: "Square order has no total" });
      continue;
    }

    const taxCents = moneyCents(order.totalTaxMoney);
    const shippingCents = shippingCentsOf(order);
    const { saleAmount, commission } = commissionForOrder({
      totalCents: moneyCents(order.totalMoney),
      taxCents,
      shippingCents,
    });

    const newSaleCents = Math.round(saleAmount * 100);
    const newCommissionCents = Math.round(commission * 100);
    const oldSaleCents = dollarsToCents(row.sale_amount);
    const oldCommissionCents = dollarsToCents(row.commission);

    if (newSaleCents === oldSaleCents && newCommissionCents === oldCommissionCents) {
      unchanged += 1;
      continue;
    }

    const period = periodOf(row.order_date);
    changes.push({
      id: row.id,
      ambassadorCode: row.ambassador_code,
      customer: row.customer,
      orderDate: row.order_date,
      period,
      oldSaleCents,
      oldCommissionCents,
      newSaleCents,
      newCommissionCents,
      deltaCommissionCents: newCommissionCents - oldCommissionCents,
      taxCents,
      shippingCents,
      alreadyPaid: period ? settled.has(`${row.ambassador_code}:${period}`) : false,
    });
  }

  const settledPeriods = new Map<string, { ambassadorCode: string; period: string; deltaCommissionCents: number }>();
  for (const change of changes) {
    if (!change.alreadyPaid || !change.period) continue;
    const key = `${change.ambassadorCode}:${change.period}`;
    const entry = settledPeriods.get(key) ?? {
      ambassadorCode: change.ambassadorCode,
      period: change.period,
      deltaCommissionCents: 0,
    };
    entry.deltaCommissionCents += change.deltaCommissionCents;
    settledPeriods.set(key, entry);
  }

  const report: BackfillReport = {
    ok: true,
    applied: false,
    checked: rows.length,
    unchanged,
    changes,
    skipped,
    deltaCommissionCents: changes.reduce((sum, c) => sum + c.deltaCommissionCents, 0),
    settledPeriods: [...settledPeriods.values()].sort((a, b) =>
      a.ambassadorCode === b.ambassadorCode
        ? a.period.localeCompare(b.period)
        : a.ambassadorCode.localeCompare(b.ambassadorCode),
    ),
  };

  if (!apply) return report;

  // One row at a time, so a failure part-way through leaves the rows it
  // did reach correct rather than rolling the lot back to figures we
  // already know are wrong. Re-running finishes the job.
  const failed: SkippedOrder[] = [];
  for (const change of changes) {
    const { error } = await supabase
      .from("orders")
      .update({
        sale_amount: change.newSaleCents / 100,
        commission: change.newCommissionCents / 100,
      })
      .eq("id", change.id);
    if (error) {
      console.error(`Commission backfill: failed to update ${change.id}:`, error.message);
      failed.push({ id: change.id, ambassadorCode: change.ambassadorCode, reason: `Update failed: ${error.message}` });
    }
  }

  return {
    ...report,
    applied: true,
    changes: changes.filter((c) => !failed.some((f) => f.id === c.id)),
    skipped: [...report.skipped, ...failed],
    deltaCommissionCents: changes
      .filter((c) => !failed.some((f) => f.id === c.id))
      .reduce((sum, c) => sum + c.deltaCommissionCents, 0),
  };
}

/** What would change, without changing anything. */
export function previewCommissionBackfill(): Promise<BackfillReport> {
  return runBackfill(false);
}

/** Write the corrections. Safe to run more than once. */
export function applyCommissionBackfill(): Promise<BackfillReport> {
  return runBackfill(true);
}
