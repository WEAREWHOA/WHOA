import { cache } from "react";
import { buildSlugIndex, buildSlugMap, looksLikeSquareId, slugify } from "./productSlug";
import { isDiscountEligible } from "./discountEligibility";
import { randomUUID } from "crypto";
import { SquareError, type Square } from "square";
import { getSquare, getSquareLocationId } from "./square";
import type { Product, ProductCategory, ProductOption, ProductOptionValue, ProductVariation } from "./types";

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

interface ItemOptionMeta {
  name: string;
  showColors: boolean;
}

interface ItemOptionValueMeta {
  name: string;
  color: string | null;
}

// Builds this item's ProductOption[] (Square's structured Item Options —
// e.g. Size, Color — see CatalogItem.itemOptions/CatalogItemVariation.
// itemOptionValues) plus each variation's optionValueIds, from a lookup of
// already-fetched ITEM_OPTION/ITEM_OPTION_VAL catalog objects. A product's
// option values are derived from what its own variations actually
// reference, not the option's global value list (which Square shares
// across every item using that option), so a dropdown never offers a
// choice this specific product doesn't have. Returns an empty options
// array for an item that doesn't use Item Options at all — the common
// case of one combined variation name (e.g. "Medium / Black") — so
// AddToCart can fall back to its existing single dropdown.
function resolveItemOptions(
  data: NonNullable<Square.CatalogObject.Item["itemData"]>,
  optionMetaById: Map<string, ItemOptionMeta>,
  optionValueMetaById: Map<string, ItemOptionValueMeta>,
): { options: ProductOption[]; optionValueIdsByVariationId: Map<string, Record<string, string>> } {
  const optionValueIdsByVariationId = new Map<string, Record<string, string>>();
  const valueIdsByOption = new Map<string, Set<string>>();

  for (const variation of data.variations ?? []) {
    if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
    const optionValueIds: Record<string, string> = {};
    for (const ov of variation.itemVariationData.itemOptionValues ?? []) {
      if (!ov.itemOptionId || !ov.itemOptionValueId) continue;
      optionValueIds[ov.itemOptionId] = ov.itemOptionValueId;
      const values = valueIdsByOption.get(ov.itemOptionId) ?? new Set<string>();
      values.add(ov.itemOptionValueId);
      valueIdsByOption.set(ov.itemOptionId, values);
    }
    optionValueIdsByVariationId.set(variation.id, optionValueIds);
  }

  const options: ProductOption[] = [];
  for (const opt of data.itemOptions ?? []) {
    const optionId = opt.itemOptionId;
    if (!optionId) continue;
    const meta = optionMetaById.get(optionId);
    const valueIds = valueIdsByOption.get(optionId);
    if (!meta || !valueIds) continue;

    const values: ProductOptionValue[] = [];
    for (const valueId of valueIds) {
      const valueMeta = optionValueMetaById.get(valueId);
      if (valueMeta) values.push({ id: valueId, name: valueMeta.name, color: valueMeta.color });
    }
    if (values.length > 0) {
      options.push({ id: optionId, name: meta.name, showColors: meta.showColors, values });
    }
  }

  return { options, optionValueIdsByVariationId };
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
// The item listing itself, shared by listProducts and listCatalogNames so
// the two can never disagree about which items count as online.
async function fetchCatalogItems(options?: { onlineOnly?: boolean }) {
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

  return items;
}

/**
 * Every product's id and name, and nothing more.
 *
 * This is the cheap half of listProducts: one paginated searchItems pass,
 * with none of the image/category/option batchGets or the per-variation
 * inventory lookup. It's what the slug map is built from, so turning a URL
 * into a product no longer costs a full catalog load.
 */
export async function listCatalogNames(options?: { onlineOnly?: boolean }) {
  const items = await fetchCatalogItems(options);
  const entries: { id: string; name: string }[] = [];
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    entries.push({ id: item.id, name: item.itemData.name ?? "" });
  }
  return entries;
}

export async function listProducts(options?: { onlineOnly?: boolean }): Promise<Product[]> {
  const square = getSquare();
  const locationId = getSquareLocationId();

  const items = await fetchCatalogItems(options);

  const imageIds = new Set<string>();
  const categoryIds = new Set<string>();
  const optionIds = new Set<string>();
  const optionValueIds = new Set<string>();
  for (const item of items) {
    if (item.type !== "ITEM" || !item.itemData) continue;
    for (const id of item.itemData.imageIds ?? []) imageIds.add(id);
    for (const opt of item.itemData.itemOptions ?? []) {
      if (opt.itemOptionId) optionIds.add(opt.itemOptionId);
    }
    for (const variation of item.itemData.variations ?? []) {
      if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
      for (const id of variation.itemVariationData.imageIds ?? []) imageIds.add(id);
      for (const ov of variation.itemVariationData.itemOptionValues ?? []) {
        if (ov.itemOptionValueId) optionValueIds.add(ov.itemOptionValueId);
      }
    }
    for (const category of item.itemData.categories ?? []) {
      if (category.id) categoryIds.add(category.id);
    }
  }

  const imageUrlById = new Map<string, string>();
  const categoryNameById = new Map<string, string>();
  const optionMetaById = new Map<string, ItemOptionMeta>();
  const optionValueMetaById = new Map<string, ItemOptionValueMeta>();
  const lookupIds = [...imageIds, ...categoryIds, ...optionIds, ...optionValueIds];
  for (const idBatch of chunk(lookupIds, BATCH_CHUNK_SIZE)) {
    const lookupResponse = await square.catalog.batchGet({ objectIds: idBatch });
    for (const obj of lookupResponse.objects ?? []) {
      if (obj.type === "IMAGE" && obj.imageData?.url) {
        imageUrlById.set(obj.id, obj.imageData.url);
      } else if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name) {
        categoryNameById.set(obj.id, obj.categoryData.name);
      } else if (obj.type === "ITEM_OPTION" && obj.id && obj.itemOptionData) {
        optionMetaById.set(obj.id, {
          name: obj.itemOptionData.displayName || obj.itemOptionData.name || "Option",
          showColors: Boolean(obj.itemOptionData.showColors),
        });
      } else if (obj.type === "ITEM_OPTION_VAL" && obj.id && obj.itemOptionValueData) {
        optionValueMetaById.set(obj.id, {
          name: obj.itemOptionValueData.name ?? "",
          color: obj.itemOptionValueData.color ?? null,
        });
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

    const { options, optionValueIdsByVariationId } = resolveItemOptions(data, optionMetaById, optionValueMetaById);

    const variations: ProductVariation[] = [];
    for (const variation of data.variations ?? []) {
      if (variation.type !== "ITEM_VARIATION" || !variation.itemVariationData) continue;
      const varData = variation.itemVariationData;
      variations.push({
        id: variation.id,
        name: varData.name ?? "Default",
        priceCents: Number(varData.priceMoney?.amount ?? 0),
        inStock: inventoryByVariationId.get(variation.id) ?? null,
        optionValueIds: optionValueIdsByVariationId.get(variation.id) ?? {},
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
      options,
      slug: "",
      updatedAt: item.updatedAt ?? null,
    });
  }

  // Slugs are assigned here, over the finished set, because uniqueness is
  // a property of the catalog rather than of any one item: two products
  // called "Tie Dye Hoodie" can't share a URL.
  const { slugById } = buildSlugIndex(products);
  for (const product of products) {
    product.slug = slugById.get(product.id) ?? product.id.toLowerCase();
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
  const optionMetaById = new Map<string, ItemOptionMeta>();
  const optionValueMetaById = new Map<string, ItemOptionValueMeta>();
  for (const obj of response.relatedObjects ?? []) {
    if (obj.type === "IMAGE" && obj.imageData?.url) {
      imageUrlById.set(obj.id, obj.imageData.url);
    } else if (obj.type === "CATEGORY" && obj.id && obj.categoryData?.name) {
      categoryNameById.set(obj.id, obj.categoryData.name);
    } else if (obj.type === "ITEM_OPTION" && obj.id && obj.itemOptionData) {
      optionMetaById.set(obj.id, {
        name: obj.itemOptionData.displayName || obj.itemOptionData.name || "Option",
        showColors: Boolean(obj.itemOptionData.showColors),
      });
    } else if (obj.type === "ITEM_OPTION_VAL" && obj.id && obj.itemOptionValueData) {
      optionValueMetaById.set(obj.id, {
        name: obj.itemOptionValueData.name ?? "",
        color: obj.itemOptionValueData.color ?? null,
      });
    }
  }

  const { options, optionValueIdsByVariationId } = resolveItemOptions(data, optionMetaById, optionValueMetaById);

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
      optionValueIds: optionValueIdsByVariationId.get(variation.id) ?? {},
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
    options,
    // Best-effort: a single fetch can't see the rest of the catalog, so it
    // can't know about a name collision. Routing goes through
    // resolveProduct (which uses the full list), so this is only ever a
    // display convenience.
    slug: slugify(data.name ?? "") || item.id.toLowerCase(),
    updatedAt: item.updatedAt ?? null,
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

// The umbrella category holding every artist's inventory, with each
// artist's own subcategory nested underneath it in Square (see
// getOrCreateArtistCategoryId below) — so Square's own Items list and
// reports show "Art Collective > <Artist Name>" instead of one flat,
// undifferentiated pile. Promo codes/discounts never apply to anything in
// it (everyone's cut except WHOA's own WHOAdega/WHOA products) — see
// checkoutAction. Was named "Artist Sales" before this hierarchy existed;
// getOrCreateArtCollectiveCategoryId renames the existing category in
// place (same id) rather than abandoning it, so every item already
// assigned to it stays assigned.
export const ART_COLLECTIVE_CATEGORY_DISPLAY_NAME = "Art Collective";
const LEGACY_ARTIST_SALES_CATEGORY_NAME = "artist sales";

async function findCategoryObjectByName(name: string): Promise<Square.CatalogObject.Category | undefined> {
  const key = name.trim().toLowerCase();
  const square = getSquare();
  const page = await square.catalog.list({ types: "CATEGORY" });
  for await (const obj of page) {
    if (obj.type === "CATEGORY" && obj.categoryData?.name?.trim().toLowerCase() === key) return obj;
  }
  return undefined;
}

let artCollectiveCategoryId: string | undefined;

// Get-or-create for the top-level "Art Collective" category, including a
// one-time migration: if it's still sitting under the old "Artist Sales"
// name, renames that exact object in place instead of creating a second,
// disconnected one. Cached per server instance — categories essentially
// never change once resolved.
export async function getOrCreateArtCollectiveCategoryId(): Promise<string> {
  if (artCollectiveCategoryId) return artCollectiveCategoryId;

  const existing = await findCategoryObjectByName(ART_COLLECTIVE_CATEGORY_DISPLAY_NAME);
  if (existing?.id) {
    artCollectiveCategoryId = existing.id;
    return existing.id;
  }

  const square = getSquare();

  const legacy = await findCategoryObjectByName(LEGACY_ARTIST_SALES_CATEGORY_NAME);
  if (legacy?.id) {
    const response = await square.catalog.object.upsert({
      idempotencyKey: `category-rename-${randomUUID()}`,
      object: {
        ...legacy,
        categoryData: { ...legacy.categoryData, name: ART_COLLECTIVE_CATEGORY_DISPLAY_NAME },
      },
    });
    const renamedId = response.catalogObject?.id;
    if (renamedId) {
      artCollectiveCategoryId = renamedId;
      return renamedId;
    }
  }

  const response = await square.catalog.object.upsert({
    idempotencyKey: `category-${randomUUID()}`,
    object: {
      type: "CATEGORY",
      id: `#category-${randomUUID()}`,
      categoryData: { name: ART_COLLECTIVE_CATEGORY_DISPLAY_NAME, isTopLevel: true },
    },
  });

  const id = response.catalogObject?.id;
  if (!id) throw new Error(`Square did not return a category id for "${ART_COLLECTIVE_CATEGORY_DISPLAY_NAME}"`);
  artCollectiveCategoryId = id;
  return id;
}

// Get-or-create for one artist's subcategory, nested under Art Collective
// via categoryData.parentCategory. If the category already exists but was
// created before this hierarchy existed (or its parent ever changes),
// patches the parent link in place rather than leaving it a stray
// top-level category. Cached per server instance per artist name. Not
// deduped across concurrent cold-start calls for a brand-new artist — an
// extremely rare race (two approvals for the same never-before-seen
// artist within milliseconds) that would just leave one harmless
// duplicate category to merge by hand in Square, not worth guarding
// against here.
const artistCategoryIdByName = new Map<string, string>();

export async function getOrCreateArtistCategoryId(artistName: string, parentCategoryId: string): Promise<string> {
  const key = artistName.trim().toLowerCase();
  const cached = artistCategoryIdByName.get(key);
  if (cached) return cached;

  const square = getSquare();
  const existing = await findCategoryObjectByName(artistName);

  if (existing?.id) {
    if (existing.categoryData?.parentCategory?.id !== parentCategoryId) {
      await square.catalog.object.upsert({
        idempotencyKey: `category-parent-${randomUUID()}`,
        object: {
          ...existing,
          categoryData: { ...existing.categoryData, parentCategory: { id: parentCategoryId } },
        },
      });
    }
    artistCategoryIdByName.set(key, existing.id);
    return existing.id;
  }

  const response = await square.catalog.object.upsert({
    idempotencyKey: `category-${randomUUID()}`,
    object: {
      type: "CATEGORY",
      id: `#category-${randomUUID()}`,
      categoryData: { name: artistName.trim(), parentCategory: { id: parentCategoryId } },
    },
  });

  const id = response.catalogObject?.id;
  if (!id) throw new Error(`Square did not return a category id for "${artistName}"`);
  artistCategoryIdByName.set(key, id);
  return id;
}

// Given a set of catalog item (product) IDs, returns the subset that must
// NOT take an ambassador/promo discount, decided by the marker in each
// item's own Square description (see lib/discountEligibility.ts).
//
// Note the direction: this returns the *ineligible* ones, so anything that
// can't be read — an id Square didn't return, a missing description — ends
// up excluded rather than quietly discounted.
//
// Checked server-side at checkout, never trusting whatever the client's
// cart claims about a product — the same never-trust-the-client posture as
// the stock and price checks around it.
export async function getDiscountIneligibleProductIds(productIds: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (productIds.length === 0) return result;

  const square = getSquare();
  for (const idBatch of chunk(productIds, BATCH_CHUNK_SIZE)) {
    const response = await square.catalog.batchGet({ objectIds: idBatch });

    const seen = new Set<string>();
    for (const obj of response.objects ?? []) {
      if (obj.type !== "ITEM" || !obj.id) continue;
      seen.add(obj.id);
      const data = obj.itemData;
      const description = data?.descriptionPlaintext ?? data?.description ?? "";
      if (!isDiscountEligible(description)) result.add(obj.id);
    }

    // An id Square didn't return — deleted, or not visible to this token —
    // is excluded too. Anything we can't read the marker on doesn't get
    // discounted.
    for (const id of idBatch) {
      if (!seen.has(id)) result.add(id);
    }
  }

  return result;
}

/**
 * Slug <-> id, and nothing else.
 *
 * Deliberately built from a names-only listing rather than listProducts().
 * Resolving /shop/<slug> used to load the entire catalog — every page of
 * searchItems, a batchGet of every image, category and option, and an
 * inventory count for every variation across ~200 items — purely to find
 * which product the URL meant. That is what made opening any single
 * product take over ten seconds while /shop itself stayed fast: /shop is
 * prerendered, the product page is rendered on demand.
 *
 * Now the URL is turned into an id from this cheap map and the product
 * itself is fetched with getProduct(), which touches one item.
 *
 * React's cache() keeps it to one lookup per request; across requests the
 * page's own `revalidate` does the caching.
 */
const slugMap = cache(async () => buildSlugMap(await listCatalogNames({ onlineOnly: true })));

/** The canonical `/shop/<slug>` path for a product. */
export function productPath(product: Product): string {
  return `/shop/${product.slug || product.id}`;
}

/**
 * The canonical path for a product known only by its Square id.
 *
 * For pages whose product data comes from somewhere other than the catalog
 * (the Supabase-synced vendor listings, say) and so has no slug of its
 * own. Falls back to the id — which still resolves and 301s — rather than
 * failing, so a link is never broken by a catalog hiccup.
 */
export async function productPathById(id: string): Promise<string> {
  try {
    const { slugById } = await slugMap();
    return `/shop/${slugById.get(id) ?? id}`;
  } catch {
    return `/shop/${id}`;
  }
}

export type ProductResolution =
  /** The URL is already canonical. Render it. */
  | { kind: "canonical"; product: Product }
  /** A Square id — still valid forever, but 301 it to the slug. */
  | { kind: "legacy-id"; product: Product; slug: string };

/**
 * Turns a `/shop/<segment>` URL into a product.
 *
 * Slugs win over ids, always: the index is checked first, so a product
 * whose name happens to slugify into something id-shaped can never be
 * shadowed by a catalog lookup. Only a segment that matches no slug *and*
 * looks like a Square id is worth asking the catalog about — a miss there
 * costs nothing, since the answer either way is a 404.
 *
 * Old id URLs keep resolving rather than being retired. They're printed on
 * cards, pasted into DMs, and sitting in Google's index; the 301 moves the
 * ranking to the slug while the original link keeps working forever.
 */
export async function resolveProduct(segment: string): Promise<ProductResolution | undefined> {
  const { idBySlug, slugById } = await slugMap();

  const idForSlug = idBySlug.get(segment);
  if (idForSlug) {
    const product = await getProduct(idForSlug);
    if (!product) return undefined;
    // getProduct fetches one item and so can't know the slug, which is a
    // property of the whole catalog. Carry it over, or productPath would
    // fall back to the id and undo the canonical URL.
    return { kind: "canonical", product: { ...product, slug: segment } };
  }

  if (!looksLikeSquareId(segment)) return undefined;

  // Only ids the catalog listing knows about resolve — that keeps the
  // online-only filter honest, so an item hidden from the shop can't be
  // reached by pasting its id.
  const slug = slugById.get(segment);
  if (!slug) return undefined;

  const product = await getProduct(segment);
  if (!product) return undefined;

  return { kind: "legacy-id", product: { ...product, slug }, slug };
}
