import { getSupabase } from "./supabase";

interface VariationRow {
  id: string;
  name: string;
  price_cents: number;
  square_inventory_counts?: { quantity: number }[];
}

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  square_product_variations?: VariationRow[];
}

export interface VendorProductVariation {
  id: string;
  name: string;
  priceCents: number;
  inStock: number;
}

export interface VendorProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  minPriceCents: number;
  totalStock: number;
  variations: VendorProductVariation[];
}

function mapProduct(row: ProductRow): VendorProduct {
  const variations: VendorProductVariation[] = (row.square_product_variations ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    priceCents: Number(v.price_cents),
    inStock: (v.square_inventory_counts ?? []).reduce((sum, c) => sum + Number(c.quantity ?? 0), 0),
  }));

  const prices = variations.map((v) => v.priceCents);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    minPriceCents: prices.length > 0 ? Math.min(...prices) : 0,
    totalStock: variations.reduce((sum, v) => sum + v.inStock, 0),
    variations,
  };
}

// Products synced from Square whose title matched this vendor's name (see
// lib/vendorMatch.ts). Used by both the Art Collective vendor page and the
// dashboard's Vendor tab.
export async function getVendorProducts(vendorSlug: string): Promise<VendorProduct[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("square_products")
    .select(
      "id, name, description, image_url, square_product_variations(id, name, price_cents, square_inventory_counts(quantity))",
    )
    .eq("owner_code", vendorSlug);

  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export interface VendorStats {
  totalSalesCents: number;
  itemsSold: number;
  orderCount: number;
}

const EMPTY_STATS: VendorStats = { totalSalesCents: 0, itemsSold: 0, orderCount: 0 };

// Sales scoped to this vendor's products, computed from synced order line
// items. Line items reference a variation id, so this resolves
// vendor -> products -> variations -> matching line items.
export async function getVendorStats(vendorSlug: string): Promise<VendorStats> {
  const supabase = getSupabase();

  const { data: products } = await supabase.from("square_products").select("id").eq("owner_code", vendorSlug);
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
