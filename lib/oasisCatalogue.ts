import { getSupabase } from "./supabase";

/**
 * OASIS CATALOGUE — pre-order items, entirely separate from the shop.
 *
 * Nothing here touches Square. These are not catalog objects, have no
 * inventory and are never charged: an order is a pre-order *request* that
 * staff follow up on. The shop can be resynced from Square at any time
 * without disturbing any of this, which is the whole reason it's separate.
 *
 * The one thing shared with the rest of the site is who you are — a signed
 * in visitor's account is used to prefill and to attribute the order.
 */

export interface OasisItem {
  slug: string;
  name: string;
  tagline: string;
  info: string;
  priceCents: number;
  /** Empty means the item has no size choice — a print, a pin. */
  sizes: string[];
  category: string;
  imageUrl: string | null;
  /** "Ships March 2027", "Made to order · 4-6 weeks". */
  leadTime: string;
  sortOrder: number;
}

interface OasisItemRow {
  slug: string;
  name: string;
  tagline: string | null;
  info: string | null;
  price_cents: number;
  sizes: string[] | null;
  category: string | null;
  image_url: string | null;
  lead_time: string | null;
  sort_order: number | null;
}

function mapRow(row: OasisItemRow): OasisItem {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? "",
    info: row.info ?? "",
    priceCents: row.price_cents,
    sizes: row.sizes ?? [],
    category: row.category ?? "General",
    imageUrl: row.image_url,
    leadTime: row.lead_time ?? "",
    sortOrder: row.sort_order ?? 0,
  };
}

/**
 * The same twelve rows migration 0027 seeds.
 *
 * Deliberately duplicated in code so the catalogue has something to show
 * before that migration has been run anywhere — a blank page is a much
 * worse first impression than placeholder stock, and this is a concept
 * preview. Used *only* when the table can't be read at all; a table that
 * exists and is genuinely empty shows as empty, because that's the truth.
 */
export const PLACEHOLDER_ITEMS: OasisItem[] = [
  {
    slug: "oasis-mirage-jacket",
    name: "Mirage Jacket",
    tagline: "Reversible desert shell",
    info: "Hand-finished reversible shell in sand and flame. Cut for layering over a hoodie, packs down into its own pocket.",
    priceCents: 18500,
    sizes: ["S", "M", "L", "XL"],
    category: "Outerwear",
    imageUrl: null,
    leadTime: "Made to order · 4-6 weeks",
    sortOrder: 10,
  },
  {
    slug: "oasis-sunfade-hoodie",
    name: "Sunfade Hoodie",
    tagline: "Garment-dyed, no two alike",
    info: "Heavyweight fleece, garment-dyed in small batches so every piece fades differently. Oversized fit.",
    priceCents: 11000,
    sizes: ["S", "M", "L", "XL", "2XL"],
    category: "Tops",
    imageUrl: null,
    leadTime: "Ships March 2027",
    sortOrder: 20,
  },
  {
    slug: "oasis-dune-cargo",
    name: "Dune Cargo Pant",
    tagline: "Eight pockets, festival-tested",
    info: "Ripstop cargo with zip thigh pockets and an adjustable hem. Designed with the WHOA OASIS crew.",
    priceCents: 13500,
    sizes: ["28", "30", "32", "34", "36"],
    category: "Bottoms",
    imageUrl: null,
    leadTime: "Made to order · 4-6 weeks",
    sortOrder: 30,
  },
  {
    slug: "oasis-heatwave-tee",
    name: "Heatwave Tee",
    tagline: "Screen-printed by hand",
    info: "Boxy cotton tee with a hand-pulled four-colour print. Print sits slightly differently on every shirt.",
    priceCents: 5500,
    sizes: ["S", "M", "L", "XL", "2XL"],
    category: "Tops",
    imageUrl: null,
    leadTime: "Ships February 2027",
    sortOrder: 40,
  },
  {
    slug: "oasis-nightbloom-set",
    name: "Nightbloom Set",
    tagline: "Matching top and short",
    info: "Two-piece in a washed floral, made to be worn together or split apart. Runs true to size.",
    priceCents: 16000,
    sizes: ["XS", "S", "M", "L"],
    category: "Sets",
    imageUrl: null,
    leadTime: "Made to order · 6-8 weeks",
    sortOrder: 50,
  },
  {
    slug: "oasis-caravan-tote",
    name: "Caravan Tote",
    tagline: "Canvas, built to be abused",
    info: "Heavy canvas tote with an internal pocket and a strap long enough to wear across the body.",
    priceCents: 6500,
    sizes: [],
    category: "Accessories",
    imageUrl: null,
    leadTime: "Ships February 2027",
    sortOrder: 60,
  },
  {
    slug: "oasis-solstice-bucket",
    name: "Solstice Bucket Hat",
    tagline: "Wide brim, packable",
    info: "Reversible bucket hat with a wider-than-usual brim. Crushes flat in a bag and springs back.",
    priceCents: 4500,
    sizes: ["S/M", "L/XL"],
    category: "Accessories",
    imageUrl: null,
    leadTime: "Ships February 2027",
    sortOrder: 70,
  },
  {
    slug: "oasis-ember-scarf",
    name: "Ember Scarf",
    tagline: "Hand-dyed silk",
    info: "Lightweight silk scarf, hand-dyed in a flame gradient. Every piece is one of one.",
    priceCents: 7500,
    sizes: [],
    category: "Accessories",
    imageUrl: null,
    leadTime: "Made to order · 3-4 weeks",
    sortOrder: 80,
  },
  {
    slug: "oasis-afterglow-print",
    name: "Afterglow Print",
    tagline: "Numbered run of 50",
    info: "Giclée print on cotton rag, signed and numbered. Ships flat in a rigid mailer.",
    priceCents: 9000,
    sizes: ["12x16", "18x24"],
    category: "Art",
    imageUrl: null,
    leadTime: "Ships April 2027",
    sortOrder: 90,
  },
  {
    slug: "oasis-desert-pin-set",
    name: "Desert Pin Set",
    tagline: "Five enamel pins",
    info: "Five hard-enamel pins on a printed backing card. Sold only as a set.",
    priceCents: 3500,
    sizes: [],
    category: "Art",
    imageUrl: null,
    leadTime: "Ships February 2027",
    sortOrder: 100,
  },
  {
    slug: "oasis-oasis-blanket",
    name: "Oasis Blanket",
    tagline: "Woven, oversized",
    info: "Cotton-blend woven blanket big enough for two. Fringed edges, gets softer with every wash.",
    priceCents: 14000,
    sizes: [],
    category: "Home",
    imageUrl: null,
    leadTime: "Made to order · 6-8 weeks",
    sortOrder: 110,
  },
  {
    slug: "oasis-lantern-candle",
    name: "Lantern Candle",
    tagline: "Hand-poured, two scents",
    info: "Soy candle hand-poured into a reusable smoked-glass lantern. Roughly 50 hours of burn.",
    priceCents: 4000,
    sizes: ["Smoke", "Citrus"],
    category: "Home",
    imageUrl: null,
    leadTime: "Ships March 2027",
    sortOrder: 120,
  },
];

export interface OasisCatalogue {
  items: OasisItem[];
  /** True when these are the built-in placeholders, not real rows. */
  usingPlaceholders: boolean;
}

export async function getOasisCatalogue(): Promise<OasisCatalogue> {
  try {
    const { data, error } = await getSupabase()
      .from("oasis_catalogue_items")
      .select("*")
      .eq("available", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load the Oasis catalogue:", error.message);
      return { items: PLACEHOLDER_ITEMS, usingPlaceholders: true };
    }

    return { items: (data ?? []).map((row) => mapRow(row as OasisItemRow)), usingPlaceholders: false };
  } catch (err) {
    console.error("Failed to load the Oasis catalogue:", err);
    return { items: PLACEHOLDER_ITEMS, usingPlaceholders: true };
  }
}

export interface OasisOrderLine {
  slug: string;
  name: string;
  size: string | null;
  unitPriceCents: number;
  quantity: number;
}

export interface OasisPreorderInput {
  accountCode: string | null;
  name: string;
  email: string;
  phone?: string;
  note?: string;
  lines: OasisOrderLine[];
}

/**
 * Records a pre-order request. Returns its id.
 *
 * The line items are written with the name and price as they were at the
 * time, so a later price change or a retired item can't rewrite what
 * someone actually asked for.
 */
export async function recordOasisPreorder(input: OasisPreorderInput): Promise<string> {
  const supabase = getSupabase();
  const totalCents = input.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  const { data, error } = await supabase
    .from("oasis_preorders")
    .insert({
      account_code: input.accountCode,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      note: input.note ?? null,
      total_cents: totalCents,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to record Oasis pre-order: ${error?.message ?? "no id returned"}`);
  }

  const preorderId = data.id as string;

  const { error: itemsError } = await supabase.from("oasis_preorder_items").insert(
    input.lines.map((line) => ({
      preorder_id: preorderId,
      item_slug: line.slug,
      item_name: line.name,
      size: line.size,
      unit_price_cents: line.unitPriceCents,
      quantity: line.quantity,
    })),
  );

  if (itemsError) {
    throw new Error(`Failed to record Oasis pre-order items: ${itemsError.message}`);
  }

  return preorderId;
}
