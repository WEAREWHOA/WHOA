import { getSquare, getSquareLocationId } from "./square";
import type { Product, ProductVariation } from "./types";

// The "Channels" section on a Square item (Online Store, POS, etc.) isn't
// exposed as a simple boolean — each item just carries a list of channel
// IDs it's enabled for, so the "Online Store" channel's ID has to be
// looked up by name first. Cached per server instance since channels
// essentially never change; a cold start just re-fetches once.
let onlineStoreChannelId: string | null | undefined;

async function getOnlineStoreChannelId(): Promise<string | null> {
  if (onlineStoreChannelId !== undefined) return onlineStoreChannelId;

  const square = getSquare();
  const page = await square.channels.list({ status: "ACTIVE" });

  let match: string | null = null;
  let fallback: string | null = null;
  for await (const channel of page) {
    const name = channel.name?.trim().toLowerCase();
    if (!name || !channel.id) continue;
    if (name === "online store") {
      match = channel.id;
      break;
    }
    if (!fallback && name.includes("online")) fallback = channel.id;
  }

  onlineStoreChannelId = match ?? fallback;
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
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    for (const id of item.itemData.imageIds ?? []) imageIds.add(id);
    for (const variation of item.itemData.variations ?? []) {
      if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
      for (const id of variation.itemVariationData.imageIds ?? []) imageIds.add(id);
    }
  }

  const imageUrlById = new Map<string, string>();
  if (imageIds.size > 0) {
    const imagesResponse = await square.catalog.batchGet({ objectIds: Array.from(imageIds) });
    for (const obj of imagesResponse.objects ?? []) {
      if (obj.type === "IMAGE" && obj.imageData?.url) {
        imageUrlById.set(obj.id, obj.imageData.url);
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

    const firstImageId = data.imageIds?.[0];

    products.push({
      id: item.id,
      name: data.name ?? "Untitled",
      description: data.descriptionPlaintext ?? data.description ?? "",
      imageUrl: firstImageId ? (imageUrlById.get(firstImageId) ?? null) : null,
      variations,
    });
  }

  return products;
}

export async function getProduct(itemId: string): Promise<Product | undefined> {
  const products = await listProducts({ onlineOnly: true });
  return products.find((p) => p.id === itemId);
}

async function getInventoryCounts(
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
