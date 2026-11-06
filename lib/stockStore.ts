import { getSupabase } from "./supabase";

/**
 * The inventory we keep ourselves.
 *
 * Stock has lived in Square and been mirrored here read-only. As Square
 * moves out this becomes the book of record, and the rule that makes
 * that survivable is that a count only ever moves through adjustStock.
 *
 * Not because a second path would be untidy. Because the moment a count
 * can change by two routes, the two routes disagree, and on one-of-ones
 * the way you find out is a customer buying something that is already
 * gone.
 */

/** Why a count moved. Free text in the table; these are the ones we write. */
export type StockReason =
  | "sale"
  | "pos"
  | "return"
  | "restock"
  | "count"
  | "tiktok"
  | "import"
  | "cancel";

export interface StockResult {
  /** What the count is now. On a refusal, what is actually there. */
  quantity: number;
  /** False means unlimited; nothing was counted and nothing was refused. */
  tracked: boolean;
  /**
   * False when a decrement was refused for want of stock.
   *
   * An ordinary outcome, not an error: somebody has to be told "only
   * two left", and that is a sentence rather than an exception.
   */
  applied: boolean;
}

interface Row {
  quantity: number;
  tracked: boolean;
  applied: boolean;
}

/**
 * Move a count, atomically.
 *
 * Negative to sell, positive to return or restock. The decision and the
 * write are one statement inside Postgres, so two people buying the
 * last of something cannot both succeed: reading the count here and
 * deciding in TypeScript is exactly the race this exists to close.
 */
export async function adjustStock(input: {
  variationId: string;
  locationId: string;
  delta: number;
  reason: StockReason;
  /** The order, ticket or TikTok order this is traceable to. */
  reference?: string | null;
  /** An account code, or nothing for the system. */
  actor?: string | null;
}): Promise<StockResult> {
  const { data, error } = await getSupabase().rpc("adjust_stock", {
    p_variation_id: input.variationId,
    p_location_id: input.locationId,
    p_delta: input.delta,
    p_reason: input.reason,
    p_reference: input.reference ?? null,
    p_actor: input.actor ?? null,
  });

  if (error) throw new Error(`Couldn't adjust stock for ${input.variationId}: ${error.message}`);

  const row = (data as Row[] | null)?.[0];
  if (!row) throw new Error(`adjust_stock returned nothing for ${input.variationId}`);
  return { quantity: row.quantity, tracked: row.tracked, applied: row.applied };
}

/**
 * Sell several things at once, all or nothing.
 *
 * A basket of three where the second is gone must not leave the first
 * one sold. Each line is adjusted in turn and anything already taken is
 * put back if a later one is refused, so the cart either goes through
 * whole or not at all.
 *
 * Compensating rather than transactional: these are separate RPC calls
 * and wrapping them in one transaction would mean holding it open
 * across the network for the length of a checkout. The put-back is
 * recorded in the ledger as a cancel, so a failed basket is visible
 * rather than looking like a sale that never was.
 */
export async function takeStock(
  lines: { variationId: string; locationId: string; quantity: number }[],
  context: { reason: StockReason; reference?: string | null; actor?: string | null },
): Promise<{ ok: true } | { ok: false; shortfall: { variationId: string; available: number } }> {
  const taken: typeof lines = [];

  for (const line of lines) {
    const result = await adjustStock({
      variationId: line.variationId,
      locationId: line.locationId,
      delta: -line.quantity,
      reason: context.reason,
      reference: context.reference,
      actor: context.actor,
    });

    if (!result.applied) {
      for (const done of taken) {
        await adjustStock({
          variationId: done.variationId,
          locationId: done.locationId,
          delta: done.quantity,
          reason: "cancel",
          reference: context.reference,
          actor: context.actor,
        }).catch((err) => {
          // Logged rather than thrown: the sale is already being
          // refused, and failing here would leave the caller with no
          // answer at all on top of stock that is still held.
          console.error(`Couldn't release held stock for ${done.variationId}:`, err);
        });
      }
      return { ok: false, shortfall: { variationId: line.variationId, available: result.quantity } };
    }

    if (result.tracked) taken.push(line);
  }

  return { ok: true };
}

/**
 * Set a count outright, for a stocktake or a correction.
 *
 * A different act from an adjustment: a delta says what happened, this
 * says what is true whatever we thought. The difference is written to
 * the ledger so a correction is visible rather than silent.
 */
export async function setStock(input: {
  variationId: string;
  locationId: string;
  quantity: number;
  tracked: boolean;
  reason: StockReason;
  actor?: string | null;
}): Promise<StockResult> {
  const { data, error } = await getSupabase().rpc("set_stock", {
    p_variation_id: input.variationId,
    p_location_id: input.locationId,
    p_quantity: input.quantity,
    p_tracked: input.tracked,
    p_reason: input.reason,
    p_actor: input.actor ?? null,
  });

  if (error) throw new Error(`Couldn't set stock for ${input.variationId}: ${error.message}`);

  const row = (data as Row[] | null)?.[0];
  if (!row) throw new Error(`set_stock returned nothing for ${input.variationId}`);
  return { quantity: row.quantity, tracked: row.tracked, applied: row.applied };
}

/**
 * Counts for a set of variations at one location.
 *
 * A variation with no row is untracked rather than sold out, which is
 * the same reading lib/stock.ts already gives a null count: something
 * nobody has counted is not the same as something there is none of.
 */
export async function getStock(
  variationIds: string[],
  locationId: string,
): Promise<Map<string, { quantity: number; tracked: boolean }>> {
  const counts = new Map<string, { quantity: number; tracked: boolean }>();
  const unique = [...new Set(variationIds)].filter(Boolean);
  if (unique.length === 0) return counts;

  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const { data, error } = await getSupabase()
      .from("stock")
      .select("variation_id, quantity, tracked")
      .eq("location_id", locationId)
      .in("variation_id", unique.slice(i, i + CHUNK));

    if (error) throw new Error(`Couldn't read stock: ${error.message}`);

    for (const row of (data ?? []) as { variation_id: string; quantity: number; tracked: boolean }[]) {
      counts.set(row.variation_id, { quantity: row.quantity, tracked: row.tracked });
    }
  }

  return counts;
}

/**
 * Fill the book from the Square mirror, once.
 *
 * The mirror is already kept current by the Square webhook, so this is
 * the honest starting point for the handover rather than a fresh count
 * off a spreadsheet.
 *
 * Idempotent, and safe to run again while Square is still the one
 * selling: it sets, so a second run simply restates what Square says.
 * Once the website is selling against this table instead, stop running
 * it, or it will overwrite real sales with Square's stale view.
 */
export async function seedStockFromSquareMirror(
  locationId: string,
  actor?: string | null,
): Promise<{ seeded: number }> {
  const supabase = getSupabase();
  let seeded = 0;
  const PAGE = 500;

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("square_inventory_counts")
      .select("variation_id, quantity")
      .eq("location_id", locationId)
      .order("variation_id", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Couldn't read the Square mirror: ${error.message}`);

    const rows = (data ?? []) as { variation_id: string; quantity: number }[];
    if (rows.length === 0) break;

    // Square has no opinion on whether we count a thing, so the flag
    // somebody set on the INVENTORY screen survives a reseed. Only the
    // number comes from Square.
    const held = await getStock(
      rows.map((row) => row.variation_id),
      locationId,
    );

    // Twenty at a time. This is a button a person pressed and is
    // waiting on, so it cannot be one round trip per variation in
    // sequence; it also cannot be five hundred at once, or it takes the
    // connection pool out from under the rest of the site.
    for (let i = 0; i < rows.length; i += 20) {
      const batch = rows.slice(i, i + 20);
      await Promise.all(
        batch.map((row) =>
          setStock({
            variationId: row.variation_id,
            locationId,
            quantity: row.quantity,
            tracked: held.get(row.variation_id)?.tracked ?? true,
            reason: "import",
            actor: actor ?? null,
          }),
        ),
      );
      seeded += batch.length;
    }

    if (rows.length < PAGE) break;
  }

  return { seeded };
}
