import { randomUUID } from "crypto";
import type { Square } from "square";
import { getSquare } from "./square";
import { getSupabase } from "./supabase";
import { matchVendorSlug, matchesArtistName } from "./vendorMatch";
import { getAllSellerNames, matchArtCollectiveCode } from "./artCollective";
import { getOrCreateArtCollectiveCategoryId, getOrCreateArtistCategoryId } from "./catalog";
import { ARTISTS } from "./artists";

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

  // Fetched once per resync (not per item) — dynamic sellers are matched
  // the same way as the static ARTISTS list (name suffix), so a product
  // created via the submission pipeline keeps its owner_code across every
  // future full resync instead of it being wiped back to null (see
  // lib/artCollective.ts's matchArtCollectiveCode). Sellers rather than
  // just art profiles, because vendors and musicians submit through the
  // same pipeline and their sales have to attribute too.
  const artProfiles = await getAllSellerNames();

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
        owner_code: matchArtCollectiveCode(name, artProfiles) ?? matchVendorSlug(name) ?? null,
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

/**
 * The stock mirror, rebuilt for the variations given.
 *
 * batchGetCounts does NOT return one row per item per location. It
 * returns one row per item per location PER STATE, and Square has
 * seventeen of them: IN_STOCK, SOLD, WASTE, RESERVED_FOR_SALE,
 * RETURNED_BY_CUSTOMER and so on. Asking without naming a state gets
 * them all, which caused three separate problems here:
 *
 *   The upsert died on "ON CONFLICT DO UPDATE command cannot affect row
 *   a second time". A variation with both an IN_STOCK and a SOLD count
 *   at one location is two rows with the same primary key, and one
 *   statement cannot update the same row twice.
 *
 *   Worse, when it did not die it could be wrong. A sold-out one-of-one
 *   often has only a SOLD count left, no IN_STOCK row at all, so the
 *   quantity written was the number SOLD and the piece read as in
 *   stock. That is the opposite of the truth, on the inventory that
 *   matters most here.
 *
 *   Only the first page was read. The same bug lib/catalog.ts already
 *   warns about: batchGetCounts paginates, and `page.data` is one page.
 *
 * So this now does what lib/catalog.ts's getInventoryCounts has always
 * done: ask for IN_STOCK only, and iterate the pages rather than the
 * first of them.
 *
 * It also writes a zero for every pair it asked about and got nothing
 * back for. Absence of a count is Square saying the item has not
 * interacted with that state at that location, which is a real zero, and
 * without writing it a variation that sells out keeps whatever row it
 * last had and stays "in stock" forever.
 */
export async function syncInventoryForVariations(variationIds: string[]): Promise<void> {
  if (variationIds.length === 0) return;

  const square = getSquare();
  const supabase = getSupabase();
  const locationIds = await getAllLocationIds();
  if (locationIds.length === 0) return;

  const key = (variationId: string, locationId: string) => `${variationId}\u0000${locationId}`;

  // Square caps batchGetCounts at 1000 catalog object ids per request; we
  // chunk well under that to keep individual calls fast. One upsert per
  // chunk (not per row) for the same reason as syncFullCatalog above.
  for (const ids of chunk(variationIds, 100)) {
    // Every pair asked about starts at zero, so a pair Square returns
    // nothing for is written as nothing rather than left at whatever it
    // was last time.
    const quantities = new Map<string, number>();
    for (const variationId of ids) {
      for (const locationId of locationIds) quantities.set(key(variationId, locationId), 0);
    }

    const page = await square.inventory.batchGetCounts({
      catalogObjectIds: ids,
      locationIds,
      states: ["IN_STOCK"],
    });

    for await (const count of page) {
      if (!count.catalogObjectId || !count.locationId) continue;
      const k = key(count.catalogObjectId, count.locationId);
      // Summed rather than assigned. One state is asked for, so a repeat
      // should not happen, but a Map keyed on the primary key is what
      // makes the upsert structurally incapable of carrying the same row
      // twice, whatever Square returns.
      quantities.set(k, (quantities.get(k) ?? 0) + Number(count.quantity ?? 0));
    }

    const updatedAt = new Date().toISOString();
    const rows = [...quantities.entries()].map(([k, quantity]) => {
      const [variation_id, location_id] = k.split("\u0000");
      return { variation_id, location_id, quantity, updated_at: updatedAt };
    });

    if (rows.length > 0) {
      const { error } = await supabase.from("square_inventory_counts").upsert(rows);
      if (error) {
        throw new Error(`Failed to sync inventory counts: ${error.message}`);
      }
    }
  }
}

/**
 * Online or in person, worked out from the fulfillment.
 *
 * Square has no channel field. What it has is this: our storefront
 * checkout attaches a SHIPMENT fulfillment, because it has an address;
 * the POS register attaches none, because the customer is standing at the
 * booth. So no fulfillment means in person, and a shipment means online.
 *
 * SHIPMENT and DELIVERY are online: both need an address, which only a
 * web order collects. IN_STORE is in person by definition. PICKUP is
 * genuinely ambiguous, since it covers both a web order someone collects
 * and a counter sale rung up for later, so it reports as `unknown`
 * rather than being forced into one side. A wrong split is worse than an
 * honest gap.
 */
function channelFor(order: Square.Order): { fulfillmentType: string | null; channel: string } {
  const fulfillmentType = order.fulfillments?.[0]?.type ?? null;
  if (!fulfillmentType) return { fulfillmentType: null, channel: "in_person" };
  if (fulfillmentType === "SHIPMENT" || fulfillmentType === "DELIVERY") {
    return { fulfillmentType, channel: "online" };
  }
  if (fulfillmentType === "IN_STORE") return { fulfillmentType, channel: "in_person" };
  return { fulfillmentType, channel: "unknown" };
}

async function upsertOrderRecord(order: Square.Order): Promise<void> {
  if (!order.id) return;
  const supabase = getSupabase();

  const base = {
    id: order.id,
    location_id: order.locationId,
    state: order.state ?? null,
    total_money_cents: Number(order.totalMoney?.amount ?? 0),
    created_at: order.createdAt ?? null,
    closed_at: order.closedAt ?? null,
    updated_at: new Date().toISOString(),
  };
  const { fulfillmentType, channel } = channelFor(order);

  let { error: orderError } = await supabase
    .from("square_orders")
    .upsert({ ...base, fulfillment_type: fulfillmentType, channel });

  // 0044 not applied yet. Keep the order and drop just the channel rather
  // than losing a sale from the mirror because a migration is outstanding.
  if (orderError && /fulfillment_type|channel/.test(orderError.message)) {
    console.error(
      "square_orders is missing the channel columns, so this order is stored without them. " +
        "Run migration 0044, then POST /api/admin/square/backfill.",
    );
    ({ error: orderError } = await supabase.from("square_orders").upsert(base));
  }

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

// Same matching conventions as matchVendorSlug/matchArtCollectiveCode
// (lib/vendorMatch.ts's matchesArtistName — either "<Product Name> -
// <Artist Name>" or "<Artist Name> ARTIST <Item Name>"), but returning
// the artist's real display name directly instead of a slug/ambassador
// code — that's what's needed to get-or-create the artist's own Square
// category.
function resolveArtistName(productName: string, names: string[]): string | undefined {
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (matchesArtistName(productName, name)) return name;
  }
  return undefined;
}

export interface CategorizeArtistsResult {
  updated: number;
  skippedAlreadyCorrect: number;
  skippedNoMatch: number;
  artists: string[];
  // Names of items that couldn't be matched to any known artist, so staff
  // can see exactly what's still sitting uncategorized instead of just a
  // count — most likely items that don't follow the "<Product> - <Artist
  // Name>" naming convention this matches against at all. Capped so a
  // catalog with hundreds of unrelated items doesn't blow up the response.
  unmatchedSample: string[];
}

const UNMATCHED_SAMPLE_LIMIT = 25;

// Catch-up for every artist/vendor product already sitting in Square
// (static ARTISTS consignment items entered by hand, plus any Art
// Collective product approved before per-artist categories existed) —
// assigns each to both "Art Collective" and its own per-artist
// subcategory nested underneath it, and sets the per-artist subcategory
// as the reporting category. New Art Collective approvals get this
// automatically going forward (see pushArtProductToSquare in
// lib/artCollective.ts); this is what makes it show up for everything
// already in the catalog too. Safe to re-run — already-correct items are
// skipped rather than re-upserted.
//
// Only items whose Square name ends in "- <Artist Name>" can be matched
// at all (the same convention pushArtProductToSquare/matchVendorSlug use)
// — a consignment item entered directly in Square without that suffix has
// no reliable signal to attribute it by, so it's left exactly where it
// was (still directly in "Art Collective" if it was already there) rather
// than guessed at. See unmatchedSample above for what's left uncategorized.
export async function backfillArtistCategories(): Promise<CategorizeArtistsResult> {
  const square = getSquare();
  const artProfiles = await getAllSellerNames();
  const names = [...artProfiles.map((p) => p.artistName), ...ARTISTS.map((a) => a.name)];

  const artCollectiveCategoryId = await getOrCreateArtCollectiveCategoryId();
  const updatedArtists = new Set<string>();
  const unmatchedSample: string[] = [];
  let updated = 0;
  let skippedAlreadyCorrect = 0;
  let skippedNoMatch = 0;
  let cursor: string | undefined;

  do {
    const response = await square.catalog.searchItems({ limit: 100, cursor });

    for (const item of response.items ?? []) {
      if (item.type !== "ITEM" || !item.itemData || !item.id) continue;

      const artistName = resolveArtistName(item.itemData.name ?? "", names);
      if (!artistName) {
        skippedNoMatch += 1;
        if (unmatchedSample.length < UNMATCHED_SAMPLE_LIMIT) unmatchedSample.push(item.itemData.name ?? item.id);
        continue;
      }

      const artistCategoryId = await getOrCreateArtistCategoryId(artistName, artCollectiveCategoryId);
      const existingCategoryIds = new Set((item.itemData.categories ?? []).map((c) => c.id));
      const alreadyCorrect =
        existingCategoryIds.has(artCollectiveCategoryId) &&
        existingCategoryIds.has(artistCategoryId) &&
        item.itemData.reportingCategory?.id === artistCategoryId;

      if (alreadyCorrect) {
        skippedAlreadyCorrect += 1;
        continue;
      }

      // Full-replacement semantics — reuse the exact object Square just
      // returned (variations, channels, version, etc. all intact) and only
      // touch the two category fields, rather than reconstructing the item
      // from scratch and risking dropping something.
      await square.catalog.object.upsert({
        idempotencyKey: randomUUID(),
        object: {
          ...item,
          itemData: {
            ...item.itemData,
            categories: [{ id: artCollectiveCategoryId }, { id: artistCategoryId }],
            reportingCategory: { id: artistCategoryId },
          },
        },
      });

      updatedArtists.add(artistName);
      updated += 1;
    }

    cursor = response.cursor;
  } while (cursor);

  return {
    updated,
    skippedAlreadyCorrect,
    skippedNoMatch,
    artists: Array.from(updatedArtists).sort(),
    unmatchedSample,
  };
}
