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

export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  variations: ProductVariation[];
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
