import { getSupabase } from "./supabase";
import { getStock } from "./stockStore";

/**
 * What the INVENTORY tab shows.
 *
 * Names come from the mirrored catalogue and counts from the stock
 * table, joined on the variation id. Deliberately not from Square's
 * live API, for two reasons: the point of this screen is the book we
 * keep, and reading Square here would show Square's answer while
 * letting somebody edit ours; and this has to keep working on the day
 * Square's key is revoked.
 */

export interface StockLine {
  variationId: string;
  productName: string;
  variationName: string;
  quantity: number;
  tracked: boolean;
  /** True when the stock table has never heard of it. */
  unseen: boolean;
}

export interface StockMovement {
  id: string;
  variationId: string;
  delta: number;
  quantityAfter: number;
  reason: string;
  reference: string | null;
  actor: string | null;
  createdAt: string;
}

/**
 * Every sellable variation, with what we think is on the shelf.
 *
 * Driven from the catalogue rather than from the stock table, so a
 * product nobody has counted yet still appears, marked as unseen. A
 * list of only what has a row would hide exactly the things that need
 * attention.
 */
export async function listStockLines(locationId: string): Promise<StockLine[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("square_product_variations")
    .select("id, name, square_products(name)")
    .order("name", { ascending: true });

  if (error) throw new Error(`Couldn't read the catalogue: ${error.message}`);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    square_products: { name: string } | { name: string }[] | null;
  }[];

  const lines = rows.map((row) => ({
    variationId: row.id,
    // The join comes back as an object or a single-element array
    // depending on how PostgREST reads the relationship; both mean one
    // product, and an unnamed one is still worth listing.
    productName:
      (Array.isArray(row.square_products) ? row.square_products[0]?.name : row.square_products?.name) ??
      "Unnamed product",
    variationName: row.name,
  }));

  const counts = await getStock(
    lines.map((l) => l.variationId),
    locationId,
  );

  return lines
    .map((line) => {
      const found = counts.get(line.variationId);
      return {
        ...line,
        quantity: found?.quantity ?? 0,
        tracked: found?.tracked ?? true,
        unseen: !found,
      };
    })
    .sort(
      (a, b) =>
        a.productName.localeCompare(b.productName) ||
        a.variationName.localeCompare(b.variationName),
    );
}

/** The last few movements, newest first: the answer to "why does it say that". */
export async function recentMovements(limit = 50, variationId?: string): Promise<StockMovement[]> {
  let query = getSupabase()
    .from("stock_movements")
    .select("id, variation_id, delta, quantity_after, reason, reference, actor, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (variationId) query = query.eq("variation_id", variationId);

  const { data, error } = await query;
  if (error) throw new Error(`Couldn't read stock movements: ${error.message}`);

  return ((data ?? []) as {
    id: string;
    variation_id: string;
    delta: number;
    quantity_after: number;
    reason: string;
    reference: string | null;
    actor: string | null;
    created_at: string;
  }[]).map((row) => ({
    id: row.id,
    variationId: row.variation_id,
    delta: row.delta,
    quantityAfter: row.quantity_after,
    reason: row.reason,
    reference: row.reference,
    actor: row.actor,
    createdAt: row.created_at,
  }));
}
