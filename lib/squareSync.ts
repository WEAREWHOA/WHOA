import type { Square } from "square";
import { getSquare } from "./square";
import { getSupabase } from "./supabase";
import { matchVendorSlug } from "./vendorMatch";

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

export async function getAllLocationIds(): Promise<string[]> {
  const square = getSquare();
  const response = await square.locations.list();
  return (response.locations ?? [])
    .map((location) => location.id)
    .filter((id): id is string => Boolean(id));
}

// Full catalog resync — simpler and more robust than trying to diff a
// webhook payload, and the catalog is small enough that refetching
// everything on each catalog.version.updated event is cheap.
export async function syncFullCatalog(): Promise<{ productIds: string[]; variationIds: string[] }> {
  const square = getSquare();
  const supabase = getSupabase();

  const productIds: string[] = [];
  const variationIds: string[] = [];
  let cursor: string | undefined;

  do {
    const response = await square.catalog.searchItems({ limit: 100, cursor });
    const items = response.items ?? [];

    const imageIds = new Set<string>();
    for (const item of items) {
      if (item.type !== "ITEM" || !item.itemData) continue;
      for (const id of item.itemData.imageIds ?? []) imageIds.add(id);
    }

    const imageUrlById = new Map<string, string>();
    if (imageIds.size > 0) {
      const imagesResponse = await square.catalog.batchGet({ objectIds: Array.from(imageIds) });
      for (const obj of imagesResponse.objects ?? []) {
        if (obj.type === "IMAGE" && obj.imageData?.url) imageUrlById.set(obj.id, obj.imageData.url);
      }
    }

    // One upsert per page instead of one per row — a catalog of any real
    // size was doing hundreds of sequential round-trips here, which is
    // what was pushing this well past Vercel's 60s function limit on
    // every catalog.version.updated webhook.
    const productRows: Record<string, unknown>[] = [];
    const variationRows: Record<string, unknown>[] = [];

    for (const item of items) {
      if (item.type !== "ITEM" || !item.itemData || !item.id) continue;
      const data = item.itemData;
      const firstImageId = data.imageIds?.[0];
      const name = data.name ?? "Untitled";

      productRows.push({
        id: item.id,
        name,
        description: data.descriptionPlaintext ?? data.description ?? null,
        image_url: firstImageId ? (imageUrlById.get(firstImageId) ?? null) : null,
        owner_code: matchVendorSlug(name) ?? null,
        updated_at: new Date().toISOString(),
      });
      productIds.push(item.id);

      for (const variation of data.variations ?? []) {
        if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData || !variation.id) continue;
        const varData = variation.itemVariationData;

        variationRows.push({
          id: variation.id,
          product_id: item.id,
          name: varData.name ?? "Default",
          price_cents: Number(varData.priceMoney?.amount ?? 0),
          updated_at: new Date().toISOString(),
        });
        variationIds.push(variation.id);
      }
    }

    if (productRows.length > 0) {
      const { error: productError } = await supabase.from("square_products").upsert(productRows);
      if (productError) {
        throw new Error(`Failed to sync products: ${productError.message}`);
      }
    }

    if (variationRows.length > 0) {
      const { error: variationError } = await supabase
        .from("square_product_variations")
        .upsert(variationRows);
      if (variationError) {
        throw new Error(`Failed to sync variations: ${variationError.message}`);
      }
    }

    cursor = response.cursor;
  } while (cursor);

  return { productIds, variationIds };
}

export async function syncInventoryForVariations(variationIds: string[]): Promise<void> {
  if (variationIds.length === 0) return;

  const square = getSquare();
  const supabase = getSupabase();
  const locationIds = await getAllLocationIds();
  if (locationIds.length === 0) return;

  // Square caps batchGetCounts at 1000 catalog object ids per request; we
  // chunk well under that to keep individual calls fast. One upsert per
  // chunk (not per row) for the same reason as syncFullCatalog above.
  for (const ids of chunk(variationIds, 100)) {
    const page = await square.inventory.batchGetCounts({
      catalogObjectIds: ids,
      locationIds,
    });

    const rows = page.data
      .filter((count) => count.catalogObjectId && count.locationId)
      .map((count) => ({
        variation_id: count.catalogObjectId,
        location_id: count.locationId,
        quantity: Number(count.quantity ?? 0),
        updated_at: new Date().toISOString(),
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from("square_inventory_counts").upsert(rows);
      if (error) {
        throw new Error(`Failed to sync inventory counts: ${error.message}`);
      }
    }
  }
}

async function upsertOrderRecord(order: Square.Order): Promise<void> {
  if (!order.id) return;
  const supabase = getSupabase();

  const { error: orderError } = await supabase.from("square_orders").upsert({
    id: order.id,
    location_id: order.locationId,
    state: order.state ?? null,
    total_money_cents: Number(order.totalMoney?.amount ?? 0),
    created_at: order.createdAt ?? null,
    closed_at: order.closedAt ?? null,
    updated_at: new Date().toISOString(),
  });
  if (orderError) {
    throw new Error(`Failed to sync order ${order.id}: ${orderError.message}`);
  }

  // Line item `uid`s aren't stable/global, so replace the full set on every
  // sync rather than trying to diff — an order rarely has more than a
  // handful of line items, so this is cheap.
  const { error: deleteError } = await supabase
    .from("square_order_line_items")
    .delete()
    .eq("order_id", order.id);
  if (deleteError) {
    throw new Error(`Failed to clear line items for order ${order.id}: ${deleteError.message}`);
  }

  const lineItems = order.lineItems ?? [];
  if (lineItems.length > 0) {
    const rows = lineItems.map((li, i) => ({
      id: `${order.id}_${li.uid ?? i}`,
      order_id: order.id,
      catalog_object_id: li.catalogObjectId ?? null,
      name: li.name ?? null,
      quantity: Number(li.quantity ?? "1"),
      total_money_cents: Number(li.totalMoney?.amount ?? 0),
    }));

    const { error: lineItemError } = await supabase.from("square_order_line_items").insert(rows);
    if (lineItemError) {
      throw new Error(`Failed to sync line items for order ${order.id}: ${lineItemError.message}`);
    }
  }
}

// Fetches a single order fresh from Square and upserts it — used by the
// webhook handler, which only receives an order id, not the full order.
export async function syncOrder(orderId: string): Promise<void> {
  const square = getSquare();
  const response = await square.orders.get({ orderId });
  if (response.order) await upsertOrderRecord(response.order);
}

// One-time historical backfill across every location. `orders.search`
// without `returnEntries` already returns full Order objects, so this
// upserts directly instead of re-fetching each order individually.
export async function backfillOrders(): Promise<number> {
  const square = getSquare();
  const locationIds = await getAllLocationIds();
  if (locationIds.length === 0) return 0;

  let cursor: string | undefined;
  let count = 0;

  do {
    const response = await square.orders.search({
      locationIds,
      limit: 100,
      cursor,
    });

    for (const order of response.orders ?? []) {
      await upsertOrderRecord(order);
      count += 1;
    }

    cursor = response.cursor;
  } while (cursor);

  return count;
}
