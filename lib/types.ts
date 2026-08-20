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
}

export interface AmbassadorStats {
  clicks: number;
  orderCount: number;
  totalSales: number;
  totalCommission: number;
}
