import { randomUUID } from "crypto";
import { getSupabase } from "./supabase";
import { getSquare, getSquareLocationId } from "./square";
import { getOnlineStoreChannelId, getOrCreateCategoryId, ARTIST_SALES_CATEGORY_DISPLAY_NAME } from "./catalog";

export interface ArtLink {
  label: string;
  url: string;
}

export interface ArtProfile {
  ambassadorCode: string;
  artistName: string;
  medium: string | null;
  tagline: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  links: ArtLink[];
  updatedAt: string;
}

interface ArtProfileRow {
  ambassador_code: string;
  artist_name: string;
  medium: string | null;
  tagline: string | null;
  bio: string | null;
  profile_image_url: string | null;
  links: ArtLink[];
  updated_at: string;
}

function mapProfile(row: ArtProfileRow): ArtProfile {
  return {
    ambassadorCode: row.ambassador_code,
    artistName: row.artist_name,
    medium: row.medium,
    tagline: row.tagline,
    bio: row.bio,
    profileImageUrl: row.profile_image_url,
    links: Array.isArray(row.links) ? row.links : [],
    updatedAt: row.updated_at,
  };
}

// Same posture as lib/musicianProfiles.ts's getMusicianProfile/
// saveMusicianProfile — one row backs both the application (created while
// perm_art is still false, i.e. pending) and the ART tab's self-editing
// form once approved.
export async function getArtProfile(code: string): Promise<ArtProfile | undefined> {
  const { data, error } = await getSupabase()
    .from("art_profiles")
    .select("*")
    .eq("ambassador_code", code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to load art profile: ${error.message}`);
  return data ? mapProfile(data as ArtProfileRow) : undefined;
}

export async function saveArtProfile(
  code: string,
  input: { artistName: string; medium?: string; tagline?: string; bio?: string; profileImageUrl?: string; links: ArtLink[] },
): Promise<void> {
  const { error } = await getSupabase()
    .from("art_profiles")
    .upsert({
      ambassador_code: code.trim().toUpperCase(),
      artist_name: input.artistName,
      medium: input.medium || null,
      tagline: input.tagline || null,
      bio: input.bio || null,
      profile_image_url: input.profileImageUrl || null,
      links: input.links,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(`Failed to save art profile: ${error.message}`);
}

// Every art_profiles row, for attributing synced Square products back to
// the right artist (see matchArtCollectiveCode below) — fetched once per
// full catalog resync rather than per item.
export async function getAllArtProfileNames(): Promise<{ code: string; artistName: string }[]> {
  const { data, error } = await getSupabase().from("art_profiles").select("ambassador_code, artist_name");
  if (error) throw new Error(`Failed to load art profiles: ${error.message}`);
  return (data ?? []).map((row) => ({ code: row.ambassador_code as string, artistName: row.artist_name as string }));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Same convention as lib/vendorMatch.ts's matchVendorSlug (a Square
// product's title ends with "- <Artist Name>"), applied to dynamic Art
// Collective artists instead of the static curated list — every approved
// product is named this way (see buildSquareItemName below), so a full
// catalog resync (lib/squareSync.ts) can always re-derive ownership
// instead of it being wiped back to null on the next
// catalog.version.updated webhook.
export function matchArtCollectiveCode(productName: string, profiles: { code: string; artistName: string }[]): string | undefined {
  const normalizedProduct = normalize(productName);
  if (!normalizedProduct) return undefined;

  const sorted = [...profiles].sort((a, b) => b.artistName.length - a.artistName.length);
  for (const profile of sorted) {
    const normalizedArtist = normalize(profile.artistName);
    if (normalizedArtist && normalizedProduct.endsWith(normalizedArtist)) return profile.code;
  }
  return undefined;
}

const PHOTOS_BUCKET = "art-photos";

// Uploads one file to the shared art-photos Storage bucket and returns its
// public URL. Used for both product photos and the profile picture — the
// bucket must exist and be public (see migration 0019_art_collective.sql,
// or create it by hand in the Supabase dashboard if that insert didn't
// take).
export async function uploadArtPhoto(folder: "products" | "profile", code: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${code.trim().toUpperCase()}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getSupabase()
    .storage.from(PHOTOS_BUCKET)
    .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: false });

  if (error) throw new Error(`Failed to upload photo: ${error.message}`);

  const { data } = getSupabase().storage.from(PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export interface ArtProduct {
  id: string;
  batchId: string;
  ambassadorCode: string;
  name: string;
  description: string | null;
  priceCents: number;
  size: string | null;
  details: string | null;
  photoUrls: string[];
  alsoRetailEvents: boolean;
  status: "pending" | "approved" | "declined";
  squareCatalogObjectId: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

interface ArtProductRow {
  id: string;
  batch_id: string;
  ambassador_code: string;
  name: string;
  description: string | null;
  price_cents: number;
  size: string | null;
  details: string | null;
  photo_urls: string[];
  also_retail_events: boolean;
  status: "pending" | "approved" | "declined";
  square_catalog_object_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

function mapProduct(row: ArtProductRow): ArtProduct {
  return {
    id: row.id,
    batchId: row.batch_id,
    ambassadorCode: row.ambassador_code,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    size: row.size,
    details: row.details,
    photoUrls: Array.isArray(row.photo_urls) ? row.photo_urls : [],
    alsoRetailEvents: row.also_retail_events,
    status: row.status,
    squareCatalogObjectId: row.square_catalog_object_id,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

export interface SubmitArtProductInput {
  ambassadorCode: string;
  name: string;
  description?: string;
  priceCents: number;
  size?: string;
  details?: string;
  photoUrls: string[];
  alsoRetailEvents: boolean;
}

// Inserts up to 5 products from one ART tab submission as a single batch
// (shared batch_id) — the "approve all" action and the admin/email view
// both key off this to treat the submission as one unit while still
// allowing each product to be approved or declined individually. Returns
// the inserted rows (with their real ids) so the caller can send one
// notification email per product, each with its own approve/decline link.
export async function submitArtProducts(products: SubmitArtProductInput[]): Promise<ArtProduct[]> {
  const batchId = randomUUID();
  const rows = products.map((p) => ({
    batch_id: batchId,
    ambassador_code: p.ambassadorCode,
    name: p.name,
    description: p.description || null,
    price_cents: p.priceCents,
    size: p.size || null,
    details: p.details || null,
    photo_urls: p.photoUrls,
    also_retail_events: p.alsoRetailEvents,
  }));

  const { data, error } = await getSupabase().from("art_products").insert(rows).select("*");
  if (error) throw new Error(`Failed to submit products: ${error.message}`);
  return (data ?? []).map((row) => mapProduct(row as ArtProductRow));
}

export async function getProductsForAccount(code: string): Promise<ArtProduct[]> {
  const { data, error } = await getSupabase()
    .from("art_products")
    .select("*")
    .eq("ambassador_code", code.trim().toUpperCase())
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load your products: ${error.message}`);
  return (data ?? []).map((row) => mapProduct(row as ArtProductRow));
}

async function getArtProductById(id: string): Promise<ArtProduct | undefined> {
  const { data, error } = await getSupabase().from("art_products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data ? mapProduct(data as ArtProductRow) : undefined;
}

export interface PendingArtBatch {
  batchId: string;
  ambassadorCode: string;
  accountName: string;
  accountEmail: string;
  products: ArtProduct[];
}

// Powers the ART ADMIN tab — every pending product, grouped by submission
// batch. Unscoped, so callers must already have confirmed the caller is
// allowed to see it (Super Admin or the artAdmin permission).
export async function getPendingArtBatches(): Promise<PendingArtBatch[]> {
  const { data, error } = await getSupabase()
    .from("art_products")
    .select("*, ambassadors(name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load pending products: ${error.message}`);

  const rows = (data ?? []) as (ArtProductRow & { ambassadors: { name: string; email: string } | null })[];
  const batches = new Map<string, PendingArtBatch>();

  for (const row of rows) {
    const existing = batches.get(row.batch_id);
    if (existing) {
      existing.products.push(mapProduct(row));
      continue;
    }
    batches.set(row.batch_id, {
      batchId: row.batch_id,
      ambassadorCode: row.ambassador_code,
      accountName: row.ambassadors?.name ?? "Unknown",
      accountEmail: row.ambassadors?.email ?? "",
      products: [mapProduct(row)],
    });
  }

  return Array.from(batches.values());
}

function buildSquareItemName(product: ArtProduct, artistName: string): string {
  return `${product.name} - ${artistName}`;
}

// Creates the real Square Catalog item + variation for an approved
// product, uploading its photos to Square directly (Square needs image
// bytes, not a hosted URL, so this re-fetches each Storage copy once) and
// making it visible both online (the configured online-store channel) and
// in person (present at the configured location, which is all POS needs —
// see lib/catalog.ts's listProducts comment on why channels only gate the
// public /shop, not the register).
async function pushArtProductToSquare(product: ArtProduct, artistName: string): Promise<string> {
  const square = getSquare();
  const locationId = getSquareLocationId();
  const onlineChannelId = await getOnlineStoreChannelId();
  const idempotencyKey = `art-product-${product.id}`;

  // Every approved product gets the umbrella "Artist Sales" category
  // (which checkout's discount exclusion keys off — see
  // getArtistSalesProductIds in lib/catalog.ts) *and* its own per-artist
  // category, set as the reporting category — so Square's own Items list
  // and Sales reports break sales out by artist instead of lumping
  // everyone under one undifferentiated bucket.
  const [artistSalesCategoryId, artistCategoryId] = await Promise.all([
    getOrCreateCategoryId(ARTIST_SALES_CATEGORY_DISPLAY_NAME),
    getOrCreateCategoryId(artistName),
  ]);

  const upsertResponse = await square.catalog.object.upsert({
    idempotencyKey,
    object: {
      type: "ITEM",
      id: `#${idempotencyKey}`,
      presentAtAllLocations: true,
      itemData: {
        name: buildSquareItemName(product, artistName),
        descriptionPlaintext: [product.description, product.details].filter(Boolean).join("\n\n") || undefined,
        channels: onlineChannelId ? [onlineChannelId] : undefined,
        categories: [{ id: artistSalesCategoryId }, { id: artistCategoryId }],
        reportingCategory: { id: artistCategoryId },
        variations: [
          {
            type: "ITEM_VARIATION",
            id: `#${idempotencyKey}-variation`,
            presentAtAllLocations: true,
            itemVariationData: {
              name: product.size || "Default",
              pricingType: "FIXED_PRICING",
              priceMoney: { amount: BigInt(product.priceCents), currency: "USD" },
            },
          },
        ],
      },
    },
  });

  const objectId = upsertResponse.catalogObject?.id;
  if (!objectId) throw new Error("Square did not return a catalog object id");

  for (const [i, url] of product.photoUrls.entries()) {
    try {
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) continue;
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

      await square.catalog.images.create({
        request: {
          idempotencyKey: `${idempotencyKey}-image-${i}`,
          objectId,
          isPrimary: i === 0,
          image: { type: "IMAGE", id: `#${idempotencyKey}-image-${i}`, imageData: { caption: product.name } },
        },
        imageFile: new Blob([imageBuffer], { type: contentType }),
      });
    } catch (err) {
      // A failed photo upload shouldn't sink the whole approval — the
      // item still gets created and can have photos added in Square
      // directly if needed.
      console.error(`Failed to attach photo ${i} for art product ${product.id}:`, err);
    }
  }

  // Not currently used by the shop's own price lookups, but keeps the
  // location explicit and mirrors how listProducts scopes searchItems to
  // a single configured location — harmless if the account only has one.
  void locationId;

  return objectId;
}

export async function reviewArtProduct(id: string, decision: "approved" | "declined"): Promise<void> {
  if (decision === "declined") {
    const { error } = await getSupabase()
      .from("art_products")
      .update({ status: "declined", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`Failed to decline product: ${error.message}`);
    return;
  }

  const product = await getArtProductById(id);
  if (!product) throw new Error("Product not found");

  const profile = await getArtProfile(product.ambassadorCode);
  const artistName = profile?.artistName ?? product.ambassadorCode;

  const squareCatalogObjectId = await pushArtProductToSquare(product, artistName);

  const { error } = await getSupabase()
    .from("art_products")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), square_catalog_object_id: squareCatalogObjectId })
    .eq("id", id);
  if (error) throw new Error(`Failed to mark product approved: ${error.message}`);
}

// Approves or declines every still-pending product in a batch — the "one
// click for the whole submission" counterpart to reviewing products
// individually. Products already handled (approved/declined) are left
// alone.
export async function reviewArtBatch(batchId: string, decision: "approved" | "declined"): Promise<void> {
  const { data, error } = await getSupabase()
    .from("art_products")
    .select("id")
    .eq("batch_id", batchId)
    .eq("status", "pending");
  if (error) throw new Error(`Failed to load batch: ${error.message}`);

  for (const row of data ?? []) {
    await reviewArtProduct(row.id, decision);
  }
}

export interface ArtStats {
  totalSalesCents: number;
  itemsSold: number;
  orderCount: number;
}

const EMPTY_STATS: ArtStats = { totalSalesCents: 0, itemsSold: 0, orderCount: 0 };

// Sales for this artist's approved products, computed from synced Square
// order line items — same approach as lib/vendor.ts's getVendorStats, but
// keyed directly by the artist's own ambassador code (set as owner_code
// via matchArtCollectiveCode during the next catalog resync) rather than
// a separate static vendor slug.
export async function getArtStats(code: string): Promise<ArtStats> {
  const supabase = getSupabase();
  const ownerCode = code.trim().toUpperCase();

  const { data: products } = await supabase.from("square_products").select("id").eq("owner_code", ownerCode);
  const productIds = (products ?? []).map((p) => p.id);
  if (productIds.length === 0) return EMPTY_STATS;

  const { data: variations } = await supabase
    .from("square_product_variations")
    .select("id")
    .in("product_id", productIds);
  const variationIds = (variations ?? []).map((v) => v.id);
  if (variationIds.length === 0) return EMPTY_STATS;

  const { data: lineItems } = await supabase
    .from("square_order_line_items")
    .select("order_id, quantity, total_money_cents")
    .in("catalog_object_id", variationIds);

  const rows = lineItems ?? [];
  return {
    totalSalesCents: rows.reduce((sum, li) => sum + Number(li.total_money_cents ?? 0), 0),
    itemsSold: rows.reduce((sum, li) => sum + Number(li.quantity ?? 0), 0),
    orderCount: new Set(rows.map((li) => li.order_id)).size,
  };
}

export interface ArtInventoryItem {
  id: string;
  name: string;
  imageUrl: string | null;
  minPriceCents: number;
  totalStock: number;
  variations: { id: string; name: string; priceCents: number; inStock: number }[];
}

interface SyncedVariationRow {
  id: string;
  name: string;
  price_cents: number;
  square_inventory_counts?: { quantity: number }[];
}

interface SyncedProductRow {
  id: string;
  name: string;
  image_url: string | null;
  square_product_variations?: SyncedVariationRow[];
}

// This artist's live, Square-synced inventory — what's actually on the
// shelf/in the online store right now, as distinct from art_products
// (the submission queue). Same source tables as lib/vendor.ts.
export async function getArtInventory(code: string): Promise<ArtInventoryItem[]> {
  const { data, error } = await getSupabase()
    .from("square_products")
    .select(
      "id, name, image_url, square_product_variations(id, name, price_cents, square_inventory_counts(quantity))",
    )
    .eq("owner_code", code.trim().toUpperCase());

  if (error || !data) return [];

  return (data as unknown as SyncedProductRow[]).map((row) => {
    const variations = (row.square_product_variations ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      priceCents: Number(v.price_cents),
      inStock: (v.square_inventory_counts ?? []).reduce((sum, c) => sum + Number(c.quantity ?? 0), 0),
    }));
    const prices = variations.map((v) => v.priceCents);
    return {
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      minPriceCents: prices.length > 0 ? Math.min(...prices) : 0,
      totalStock: variations.reduce((sum, v) => sum + v.inStock, 0),
      variations,
    };
  });
}
