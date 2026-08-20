import { getSupabase } from "./supabase";
import type { Ambassador, AmbassadorStats, Order, PayoutSettings } from "./types";

interface AmbassadorRow {
  code: string;
  name: string;
  email: string;
  instagram: string | null;
  created_at: string;
  clicks: number;
  payout_method: PayoutSettings["method"] | null;
  payout_destination: string | null;
  orders?: OrderRow[];
}

interface OrderRow {
  id: string;
  order_date: string;
  customer: string;
  sale_amount: number;
  commission: number;
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    date: row.order_date,
    customer: row.customer,
    saleAmount: Number(row.sale_amount),
    commission: Number(row.commission),
  };
}

function mapAmbassador(row: AmbassadorRow): Ambassador {
  return {
    code: row.code,
    name: row.name,
    email: row.email,
    instagram: row.instagram ?? undefined,
    createdAt: row.created_at,
    clicks: row.clicks,
    orders: (row.orders ?? []).map(mapOrder),
    payout:
      row.payout_method && row.payout_destination
        ? { method: row.payout_method, destination: row.payout_destination }
        : null,
  };
}

const AMBASSADOR_WITH_ORDERS = "*, orders(*)";

function slugFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const slug = first.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return slug || "AMBASSADOR";
}

async function codeExists(code: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("ambassadors")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  return data !== null;
}

async function generateCode(name: string): Promise<string> {
  const base = slugFromName(name);
  const preferred = `WHOA-${base}15`;
  if (!(await codeExists(preferred))) return preferred;

  let suffix = 16;
  let candidate = `WHOA-${base}${suffix}`;
  while (await codeExists(candidate)) {
    suffix += 1;
    candidate = `WHOA-${base}${suffix}`;
  }
  return candidate;
}

export async function createAmbassador(input: {
  name: string;
  email: string;
  instagram?: string;
}): Promise<Ambassador> {
  const code = await generateCode(input.name);
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .insert({
      code,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      instagram: input.instagram?.trim() || null,
    })
    .select(AMBASSADOR_WITH_ORDERS)
    .single();

  if (error || !data) {
    throw new Error(`Failed to create ambassador: ${error?.message ?? "unknown error"}`);
  }

  return mapAmbassador(data as AmbassadorRow);
}

export async function getByCode(code: string): Promise<Ambassador | undefined> {
  const { data } = await getSupabase()
    .from("ambassadors")
    .select(AMBASSADOR_WITH_ORDERS)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  return data ? mapAmbassador(data as AmbassadorRow) : undefined;
}

export async function getByEmail(email: string): Promise<Ambassador | undefined> {
  const { data } = await getSupabase()
    .from("ambassadors")
    .select(AMBASSADOR_WITH_ORDERS)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  return data ? mapAmbassador(data as AmbassadorRow) : undefined;
}

export async function recordClick(code: string): Promise<boolean> {
  const { error } = await getSupabase().rpc("increment_ambassador_clicks", { p_code: code });
  return !error;
}

export async function setPayout(code: string, payout: PayoutSettings): Promise<boolean> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ payout_method: payout.method, payout_destination: payout.destination })
    .eq("code", code);

  return !error;
}

export function getStats(ambassador: Ambassador): AmbassadorStats {
  const orderCount = ambassador.orders.length;
  const totalSales = ambassador.orders.reduce((sum, o) => sum + o.saleAmount, 0);
  const totalCommission = ambassador.orders.reduce((sum, o) => sum + o.commission, 0);
  return { clicks: ambassador.clicks, orderCount, totalSales, totalCommission };
}
