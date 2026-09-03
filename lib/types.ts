export type TierId = "rookie" | "rising" | "icon";

export interface Order {
  id: string;
  date: string;
  customer: string;
  saleAmount: number;
  commission: number;
}

export interface PayoutSettings {
  method: "paypal" | "venmo" | "bank";
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
