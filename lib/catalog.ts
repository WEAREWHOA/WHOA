import { getSquare, getSquareLocationId } from "./square";
import type { Product, ProductVariation } from "./types";

export async function listProducts(): Promise<Product[]> {
  const square = getSquare();
  const locationId = getSquareLocationId();

  const response = await square.catalog.searchItems({
    enabledLocationIds: [locationId],
    limit: 100,
  });

  const items = response.items ?? [];

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
  const products = await listProducts();
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
