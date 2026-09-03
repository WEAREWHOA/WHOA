import { getSquare, getSquareLocationId } from "./square";
import type { Product, ProductCategory, ProductVariation } from "./types";

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

  const response = await square.catalog.searchItems({
    enabledLocationIds: [locationId],
    limit: 100,
  });

  let items = response.items ?? [];

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
  if (lookupIds.length > 0) {
    const lookupResponse = await square.catalog.batchGet({ objectIds: lookupIds });
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

export async function getProduct(itemId: string): Promise<Product | undefined> {
  const products = await listProducts({ onlineOnly: true });
  return products.find((p) => p.id === itemId);
}

export async function getInventoryCounts(
  variationIds: string[],
  locationId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (variationIds.length === 0) return counts;

  const square = getSquare();
  const page = await square.inventory.batchGetCounts({
    catalogObjectIds: variationIds,
    locationIds: [locationId],
    states: ["IN_STOCK"],
  });

  for (const count of page.data) {
    if (!count.catalogObjectId) continue;
    const existing = counts.get(count.catalogObjectId) ?? 0;
    counts.set(count.catalogObjectId, existing + Number(count.quantity ?? 0));
  }

  return counts;
}
