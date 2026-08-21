import { getSupabase } from "./supabase";

export interface PosOrderLineSummary {
  name: string;
  quantity: number;
}

export interface PosOrderSummary {
  id: string;
  totalCents: number;
  createdAt: string | null;
  lines: PosOrderLineSummary[];
}

interface OrderRow {
  id: string;
  total_money_cents: number;
  created_at: string | null;
  square_order_line_items?: { name: string | null; quantity: number }[];
}

// Recent register activity for the POS Transactions tab — read from the
// Square sync mirror (lib/squareSync.ts) rather than calling Square's API
// directly, so this stays fast regardless of how much order history exists.
export async function getRecentOrders(limit = 50): Promise<PosOrderSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("square_orders")
    .select("id, total_money_cents, created_at, square_order_line_items(name, quantity)")
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as unknown as OrderRow[]).map((row) => ({
    id: row.id,
    totalCents: Number(row.total_money_cents ?? 0),
    createdAt: row.created_at,
    lines: (row.square_order_line_items ?? []).map((li) => ({
      name: li.name ?? "Item",
      quantity: Number(li.quantity ?? 1),
    })),
  }));
}
