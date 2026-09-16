export type TierId = "rookie" | "rising" | "icon";

export interface Order {
  id: string;
  date: string;
  customer: string;
  saleAmount: number;
  commission: number;
}

export interface PayoutSettings {
  method: "venmo" | "zelle";
  // The phone number attached to the ambassador's Venmo or Zelle account —
  // both services identify an account by phone number, so one field covers
  // either method.
  destination: string;
}

export interface AmbassadorLink {
  id: string;
  label: string;
  slug: string;
  clicks: number;
  createdAt: string;
}

// Which extra dashboard tabs an account has unlocked. Every account gets
// the Customer tab for free; these are granted by a Super Admin (or set
// automatically by the /apply ambassador flow) on top of that.
export interface AccountPermissions {
  ambassador: boolean;
  vendor: boolean;
  music: boolean;
  ssbd: boolean;
  eventsAdmin: boolean;
  // "SELL FOR US" — event/festival sales crew. Separate from `ambassador`:
  // signs up to work specific events rather than referring sales online.
  eventSales: boolean;
  // Self-service Art Collective membership — profile + submitting
  // products for the ART tab. Distinct from `vendor`, which is the
  // existing curated/static artist system.
  art: boolean;
  // Reviews art-collective product submissions (ART ADMIN tab). An artist
  // doesn't get to approve their own submissions just by having `art`.
  artAdmin: boolean;
  // ROLODEX tab: the business contact book. Off by default and granted
  // one account at a time — it holds people's personal phone numbers.
  rolodex: boolean;
  // Works the door (RSVP ADMIN tab): scans tickets and admits guests.
  // Separate from `eventsAdmin` on purpose — the people scanning
  // wristbands at 11pm aren't necessarily the people who should see every
  // guest list and revenue figure for every event ever held.
  rsvpAdmin: boolean;
}

// Despite the name, this now represents any backend-portal account, not
// just ambassadors — a plain customer signup and an ambassador are the same
// row, distinguished only by `permissions`.
export interface Ambassador {
  code: string;
  name: string;
  email: string;
  instagram?: string;
  createdAt: string;
  orders: Order[];
  links: AmbassadorLink[];
  payout: PayoutSettings | null;
  vendorSlug?: string;
  permissions: AccountPermissions;
  isSuperAdmin: boolean;
  squareCustomerId?: string;
}

export interface AmbassadorStats {
  clicks: number;
  orderCount: number;
  totalSales: number;
  totalCommission: number;
}

export interface ProductVariation {
  id: string;
  name: string;
  priceCents: number;
  inStock: number | null;
  // Maps each Product.options[].id this variation has a choice for to the
  // chosen ProductOptionValue id (e.g. { "<size-option-id>":
  // "<medium-value-id>" }) — only populated for an item built with
  // Square's structured Item Options feature. Empty for the common case of
  // a plain variation name (e.g. "Medium / Black" as one string); AddToCart
  // falls back to a single combined dropdown when Product.options is empty.
  optionValueIds: Record<string, string>;
}

export interface ProductOptionValue {
  id: string;
  name: string;
  // Hex color (e.g. "#ff8d4e"), only meaningful when the parent
  // ProductOption.showColors is true.
  color: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  showColors: boolean;
  values: ProductOptionValue[];
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  // Every photo uploaded for this item, in Square's own order — imageUrl
  // is always imageUrls[0] (kept separately since most call sites only
  // ever need a single thumbnail).
  imageUrls: string[];
  variations: ProductVariation[];
  categories: ProductCategory[];
  // Square's structured Item Options (e.g. Size, Color) actually used by
  // this item's own variations, in Square's own dimension order — empty
  // for an item that just names each variation as one combined string.
  options: ProductOption[];
  // The readable URL segment this product is served at: /shop/<slug>.
  // Assigned across the whole catalog by listProducts so it's unique even
  // when two items share a name — see lib/productSlug.ts.
  slug: string;
  // Square's own last-modified timestamp (ISO). Feeds <lastmod> in the
  // sitemap so search engines re-crawl a product whose price or photos
  // actually changed instead of guessing. Null when Square omits it.
  updatedAt: string | null;
}

// US-only for now — international shipping isn't supported yet.
export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface CartLine {
  variationId: string;
  productId: string;
  productName: string;
  variationName: string;
  priceCents: number;
  quantity: number;
  imageUrl: string | null;
}
