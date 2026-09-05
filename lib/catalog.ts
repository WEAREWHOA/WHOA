import { SquareError } from "square";
import { getSquare, getSquareLocationId } from "./square";
import type { Product, ProductCategory, ProductVariation } from "./types";

// Square's batch endpoints (catalog.batchGet, inventory.batchGetCounts)
// document a max object-ID count per request — chunking keeps every call
// safely under that regardless of how big the real catalog gets, instead
// of relying on it happening to stay small enough.
const BATCH_CHUNK_SIZE = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// The "Channels" section on a Square item (Online Store, POS, etc.) isn't
// exposed as a simple boolean — each item just carries a list of channel
// IDs it's enabled for, so the target channel's ID has to be looked up by
// name first. Cached per server instance since channels essentially never
// change; a cold start just re-fetches once.
let onlineStoreChannelId: string | null | undefined;

// Square's built-in "Online Store" channel only exists for sellers using
// Square's own hosted site — this account doesn't (that's the storefront
// this app replaces), so there's no channel literally named that. Sellers
// without one have used a custom channel of their own naming to mark
// "show this online" (here, one named "WHOA") — SQUARE_ONLINE_CHANNEL_NAME
// lets that real name be configured instead of guessed at. Falls back to
// the "Online Store"/"online" heuristic for accounts that do have Square's
// built-in channel.
export async function getOnlineStoreChannelId(): Promise<string | null> {
  if (onlineStoreChannelId !== undefined) return onlineStoreChannelId;

  const square = getSquare();
  const page = await square.channels.list({ status: "ACTIVE" });

  const configuredName = process.env.SQUARE_ONLINE_CHANNEL_NAME?.trim().toLowerCase();

  let configured: string | null = null;
  let match: string | null = null;
  let fallback: string | null = null;
  for await (const channel of page) {
    const name = channel.name?.trim().toLowerCase();
    if (!name || !channel.id) continue;
    if (configuredName && name === configuredName) {
      configured = channel.id;
      break;
    }
    if (name === "online store") match = channel.id;
    if (!fallback && name.includes("online")) fallback = channel.id;
  }

  onlineStoreChannelId = configured ?? match ?? fallback;
  return onlineStoreChannelId;
}

// `onlineOnly` scopes results to items with the "Online Store" channel
// checked in Square — used by the public shop, which shouldn't show
// internal/private inventory. The POS register (which doesn't pass this)
// still sees everything, since staff need to sell in-person-only items too.
export async function listProducts(options?: { onlineOnly?: boolean }): Promise<Product[]> {
  const square = getSquare();
  const locationId = getSquareLocationId();

  // searchItems paginates (100 items per page by default) — a catalog
  // with more than one page's worth of items would otherwise silently
  // lose everything past the first page from /shop's listing.
  let items: NonNullable<Awaited<ReturnType<typeof square.catalog.searchItems>>["items"]> = [];
  let cursor: string | undefined;
  do {
    // Only include `cursor` on the request at all once there is one —
    // some Square SDK request validators reject a key explicitly present
    // with value `undefined` differently than the key being absent.
    const response = await square.catalog.searchItems({
      enabledLocationIds: [locationId],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    items = items.concat(response.items ?? []);
    cursor = response.cursor;
  } while (cursor);

  if (options?.onlineOnly) {
    const channelId = await getOnlineStoreChannelId();
    // Fail closed: if the "Online Store" channel can't be identified at
    // all, showing nothing (an obviously broken shop that gets reported)
    // is a safer default than silently showing every item, including
    // ones deliberately kept off the public site.
    items = channelId
      ? items.filter((item) => item.type === "ITEM" && item.itemData?.channels?.includes(channelId))
      : [];
  }

  const imageIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    for (const id of item.itemData.imageIds ?? []) imageIds.add(id);
    for (const variation of item.itemData.variations ?? []) {
      if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
      for (const id of variation.itemVariationData.imageIds ?? []) imageIds.add(id);
    }
    for (const category of item.itemData.categories ?? []) {
      if (category.id) categoryIds.add(category.id);
    }
  }

  const imageUrlById = new Map<string, string>();
  const categoryNameById = new Map<string, string>();
  const lookupIds = [...imageIds, ...categoryIds];
  for (const idBatch of chunk(lookupIds, BATCH_CHUNK_SIZE)) {
    const lookupResponse = await square.catalog.batchGet({ objectIds: idBatch });
    for (const obj of lookupResponse.objects ?? []) {
      if (obj.type === "IMAGE" && obj.imageData?.url) {
        imageUrlById.set(obj.id, obj.imageData.url);
      } else if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name) {
        categoryNameById.set(obj.id, obj.categoryData.name);
      }
    }
  }

  const variationIds: string[] = [];
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    for (const variation of item.itemData.variations ?? []) {
      if (variation.type === "ITEM_VARIATION") variationIds.push(variation.id);
    }
  }

  const inventoryByVariationId = await getInventoryCounts(variationIds, locationId);

  const products: Product[] = [];
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    const data = item.itemData;

    const variations: ProductVariation[] = [];
    for (const variation of data.variations ?? []) {
      if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
      const varData = variation.itemVariationData;
      variations.push({
        id: variation.id,
        name: varData.name ?? "Default",
        priceCents: Number(varData.priceMoney?.amount ?? 0),
        inStock: inventoryByVariationId.get(variation.id) ?? null,
      });
    }

    const imageUrls: string[] = [];
    for (const id of data.imageIds ?? []) {
      const url = imageUrlById.get(id);
      if (url) imageUrls.push(url);
    }

    const categories: ProductCategory[] = [];
    for (const category of data.categories ?? []) {
      if (!category.id) continue;
      const name = categoryNameById.get(category.id);
      if (name) categories.push({ id: category.id, name });
    }

    products.push({
      id: item.id,
      name: data.name ?? "Untitled",
      description: data.descriptionPlaintext ?? data.description ?? "",
      imageUrl: imageUrls[0] ?? null,
      imageUrls,
      variations,
      categories,
    });
  }

  return products;
}

// A dedicated single-item fetch — getProduct() used to call listProducts()
// (the entire catalog: every page of searchItems, every image/category
// batchGet, every variation's inventory count) just to .find() one item
// out of it. That's fine at a handful of products; at this catalog's real
// size (~200 items) it made every single product-detail page load pull
// the whole store first, which is what was actually behind the ~10s page
// loads. catalog.object.get with includeRelatedObjects resolves the
// item's images/categories in the same request, so this only ever touches
// the one item plus a small inventory lookup for its own variations.
export async function getProduct(itemId: string): Promise<Product | undefined> {
  const square = getSquare();
  const locationId = getSquareLocationId();

  let response;
  try {
    response = await square.catalog.object.get({ objectId: itemId, includeRelatedObjects: true });
  } catch (err) {
    // A nonexistent object ID is a normal 404, not a real failure —
    // anything else (auth, network) should still propagate and surface as
    // a real error rather than a misleading "not found".
    if (err instanceof SquareError && err.statusCode === 404) return undefined;
    throw err;
  }

  const item = response.object;
  if (!item || item.type !== "ITEM" || !item.itemData) return undefined;

  // Same online-visibility rule as listProducts({ onlineOnly: true }) —
  // an item not checked for the Online Store channel shouldn't be
  // reachable by direct URL either.
  const channelId = await getOnlineStoreChannelId();
  if (!channelId || !item.itemData.channels?.includes(channelId)) return undefined;

  const data = item.itemData;

  const imageUrlById = new Map<string, string>();
  const categoryNameById = new Map<string, string>();
  for (const obj of response.relatedObjects ?? []) {
    if (obj.type === "IMAGE" && obj.imageData?.url) {
      imageUrlById.set(obj.id, obj.imageData.url);
    } else if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name) {
      categoryNameById.set(obj.id, obj.categoryData.name);
    }
  }

  const variationIds: string[] = [];
  for (const variation of data.variations ?? []) {
    if (variation.type === "ITEM_VARIATION") variationIds.push(variation.id);
  }
  const inventoryByVariationId = await getInventoryCounts(variationIds, locationId);

  const variations: ProductVariation[] = [];
  for (const variation of data.variations ?? []) {
    if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
    const varData = variation.itemVariationData;
    variations.push({
      id: variation.id,
      name: varData.name ?? "Default",
      priceCents: Number(varData.priceMoney?.amount ?? 0),
      inStock: inventoryByVariationId.get(variation.id) ?? null,
    });
  }

  const imageUrls: string[] = [];
  for (const id of data.imageIds ?? []) {
    const url = imageUrlById.get(id);
    if (url) imageUrls.push(url);
  }

  const categories: ProductCategory[] = [];
  for (const category of data.categories ?? []) {
    if (!category.id) continue;
    const name = categoryNameById.get(category.id);
    if (name) categories.push({ id: category.id, name });
  }

  return {
    id: item.id,
    name: data.name ?? "Untitled",
    description: data.descriptionPlaintext ?? data.description ?? "",
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    variations,
    categories,
  };
}

export async function getInventoryCounts(
  variationIds: string[],
  locationId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variationIds.length === 0) return counts;

  const square = getSquare();

  for (const idBatch of chunk(variationIds, BATCH_CHUNK_SIZE)) {
    const page = await square.inventory.batchGetCounts({
      catalogObjectIds: idBatch,
      locationIds: [locationId],
      states: ["IN_STOCK"],
    });

    // batchGetCounts paginates just like catalog.searchItems does —
    // reading only `page.data` (the first page) would silently
    // under-report stock for anything past it once there's enough real
    // inventory to span pages.
    for await (const count of page) {
      if (!count.catalogObjectId) continue;
      const existing = counts.get(count.catalogObjectId) ?? 0;
      counts.set(count.catalogObjectId, existing + Number(count.quantity ?? 0));
    }
  }

  return counts;
}

// The one Square category that promo codes/discounts never apply to
// (artist inventory — everyone's cut except WHOA's own WHOAdega/WHOA
// items) — see checkoutAction. Cached per server instance, same posture
// as getOnlineStoreChannelId above: categories essentially never change,
// so a cold start just re-fetches once.
const ARTIST_SALES_CATEGORY_NAME = "artist sales";
let artistSalesCategoryId: string | null | undefined;

async function getArtistSalesCategoryId(): Promise<string | null> {
  if (artistSalesCategoryId !== undefined) return artistSalesCategoryId;

  const square = getSquare();
  const page = await square.catalog.list({ types: "CATEGORY" });

  let found: string | null = null;
  for await (const obj of page) {
    if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name?.trim().toLowerCase() === ARTIST_SALES_CATEGORY_NAME) {
      found = obj.id;
      break;
    }
  }

  artistSalesCategoryId = found;
  return artistSalesCategoryId;
}

// Given a set of catalog item (product) IDs, returns the subset that
// belong to the "Artist Sales" category — checked server-side at
// checkout, never trusting whatever category info (if any) the client
// sent, the same never-trust-the-client posture as stock/price checks
// elsewhere in checkout.
export async function getArtistSalesProductIds(productIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (productIds.length === 0) return result;

  const categoryId = await getArtistSalesCategoryId();
  if (!categoryId) return result;

  const square = getSquare();
  for (const idBatch of chunk(productIds, BATCH_CHUNK_SIZE)) {
    const response = await square.catalog.batchGet({ objectIds: idBatch });
    for (const obj of response.objects ?? []) {
      if (obj.type !== "ITEM" || !obj.id) continue;
      const categories = obj.itemData?.categories ?? [];
      if (categories.some((c) => c.id === categoryId)) result.add(obj.id);
    }
  }

  return result;
}
