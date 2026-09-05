import { getSupabase } from "./supabase";
import type {
  AccountPermissions,
  Ambassador,
  AmbassadorLink,
  AmbassadorStats,
  Order,
  PayoutSettings,
} from "./types";

interface AmbassadorRow {
  code: string;
  name: string;
  email: string;
  instagram: string | null;
  created_at: string;
  payout_method: PayoutSettings["method"] | null;
  payout_destination: string | null;
  vendor_slug: string | null;
  perm_ambassador: boolean;
  perm_vendor: boolean;
  perm_music: boolean;
  perm_ssbd: boolean;
  perm_events_admin: boolean;
  is_super_admin: boolean;
  square_customer_id: string | null;
  orders?: OrderRow[];
  links?: LinkRow[];
}

interface OrderRow {
  id: string;
  order_date: string;
  customer: string;
  sale_amount: number;
  commission: number;
}

interface LinkRow {
  id: string;
  label: string;
  slug: string;
  clicks: number;
  created_at: string;
}

// Explicit column list (no password_hash) — this is the select used
// everywhere an Ambassador is returned to the app. Credentials are only
// ever fetched separately, by the two getCredentials* functions below.
const AMBASSADOR_PUBLIC_SELECT =
  "code, name, email, instagram, created_at, payout_method, payout_destination, vendor_slug, " +
  "perm_ambassador, perm_vendor, perm_music, perm_ssbd, perm_events_admin, is_super_admin, square_customer_id, orders(*), links(*)";

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    date: row.order_date,
    customer: row.customer,
    saleAmount: Number(row.sale_amount),
    commission: Number(row.commission),
  };
}

function mapLink(row: LinkRow): AmbassadorLink {
  return {
    id: row.id,
    label: row.label,
    slug: row.slug,
    clicks: row.clicks,
    createdAt: row.created_at,
  };
}

function mapAmbassador(row: AmbassadorRow): Ambassador {
  return {
    code: row.code,
    name: row.name,
    email: row.email,
    instagram: row.instagram ?? undefined,
    createdAt: row.created_at,
    orders: (row.orders ?? []).map(mapOrder),
    links: (row.links ?? []).map(mapLink),
    payout:
      row.payout_method && row.payout_destination
        ? { method: row.payout_method, destination: row.payout_destination }
        : null,
    vendorSlug: row.vendor_slug ?? undefined,
    permissions: {
      ambassador: row.perm_ambassador,
      vendor: row.perm_vendor,
      music: row.perm_music,
      ssbd: row.perm_ssbd,
      eventsAdmin: row.perm_events_admin,
    },
    isSuperAdmin: row.is_super_admin,
    squareCustomerId: row.square_customer_id ?? undefined,
  };
}

function slugify(text: string, maxLength = 12): string {
  return text.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, maxLength);
}

async function codeExists(code: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select("code")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`Failed to check code availability: ${error.message}`);
  return data !== null;
}

async function linkSlugExists(slug: string): Promise<boolean> {
  const { data, error } = await getSupabase().from("links").select("slug").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Failed to check link slug availability: ${error.message}`);
  return data !== null;
}

// First name + last name, run together (e.g. "Jane Doe" -> "JANEDOE") —
// easier to hand out and remember than the old "WHOA-<NAME>15" scheme. A
// single-word name just uses that word. Collisions (two "Jane Doe"s) fall
// back to appending 2, 3, 4...
async function generateAmbassadorCode(name: string): Promise<string> {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const base = slugify(`${first}${last}`, 20) || "AMBASSADOR";
  if (!(await codeExists(base))) return base;

  let suffix = 2;
  let candidate = `${base}${suffix}`;
  while (await codeExists(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

async function generateLinkSlug(ambassadorCode: string, label: string): Promise<string> {
  const base = `${ambassadorCode}-${slugify(label) || "LINK"}`;
  if (!(await linkSlugExists(base))) return base;

  let suffix = 2;
  let candidate = `${base}${suffix}`;
  while (await linkSlugExists(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }
  return candidate;
}

// Creates a backend-portal account. Despite the name, this is used for
// every signup — a plain customer, not just an ambassador — so the
// permissions below default to false and only /apply (the dedicated
// ambassador application) turns `ambassador` on at creation time. A Super
// Admin can grant any permission afterward from /super-admin.
export async function createAmbassador(input: {
  name: string;
  email: string;
  instagram?: string;
  passwordHash: string;
  permissions?: Partial<AccountPermissions>;
}): Promise<Ambassador> {
  const code = await generateAmbassadorCode(input.name);
  const supabase = getSupabase();
  const isAmbassador = input.permissions?.ambassador ?? false;

  const { error: ambassadorError } = await supabase.from("ambassadors").insert({
    code,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    instagram: input.instagram?.trim() || null,
    password_hash: input.passwordHash,
    perm_ambassador: isAmbassador,
    perm_vendor: input.permissions?.vendor ?? false,
    perm_music: input.permissions?.music ?? false,
    perm_ssbd: input.permissions?.ssbd ?? false,
    perm_events_admin: input.permissions?.eventsAdmin ?? false,
  });

  if (ambassadorError) {
    throw new Error(`Failed to create ambassador: ${ambassadorError.message}`);
  }

  // Only ambassadors get a trackable referral link — a plain customer
  // account has no use for one.
  if (isAmbassador) {
    const { error: linkError } = await supabase.from("links").insert({
      id: `link_${code.toLowerCase()}_default`,
      ambassador_code: code,
      label: "Default",
      slug: code,
    });

    if (linkError) {
      throw new Error(`Failed to create default link: ${linkError.message}`);
    }
  }

  const ambassador = await getByCode(code);
  if (!ambassador) {
    throw new Error("Failed to load ambassador after creation");
  }
  return ambassador;
}

export async function getByCode(code: string): Promise<Ambassador | undefined> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select(AMBASSADOR_PUBLIC_SELECT)
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();

  // Surface a broken Supabase connection (e.g. a stale service-role key) as
  // a real error instead of silently looking like "account not found" and
  // sending the caller into a misleading 404.
  if (error) throw new Error(`Failed to look up account by code: ${error.message}`);

  return data ? mapAmbassador(data as unknown as AmbassadorRow) : undefined;
}

export async function getByEmail(email: string): Promise<Ambassador | undefined> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select(AMBASSADOR_PUBLIC_SELECT)
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to look up account by email: ${error.message}`);

  return data ? mapAmbassador(data as unknown as AmbassadorRow) : undefined;
}

// Credentials are fetched only here, never as part of the public Ambassador
// shape, so a password hash can't accidentally end up rendered or logged.
// Excludes a deleted account (see deactivateAccount) — this is what
// actually blocks it from signing back in, since a deleted row otherwise
// stays fully intact for its historical orders/links/commissions.
export async function getCredentialsByCode(
  code: string,
): Promise<{ code: string; passwordHash: string } | undefined> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select("code, password_hash")
    .eq("code", code.trim().toUpperCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up credentials by code: ${error.message}`);

  return data?.password_hash ? { code: data.code, passwordHash: data.password_hash } : undefined;
}

export async function getCredentialsByEmail(
  email: string,
): Promise<{ code: string; passwordHash: string } | undefined> {
  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select("code, password_hash")
    .eq("email", email.trim().toLowerCase())
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up credentials by email: ${error.message}`);

  return data?.password_hash ? { code: data.code, passwordHash: data.password_hash } : undefined;
}

// Super Admin account search — case-insensitive partial match on name,
// email, or code. Never returns password hashes (uses the same public
// select as everything else).
export async function searchAccounts(query: string): Promise<Ambassador[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await getSupabase()
    .from("ambassadors")
    .select(AMBASSADOR_PUBLIC_SELECT)
    .or(`name.ilike.%${q}%,email.ilike.%${q}%,code.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(`Failed to search accounts: ${error.message}`);

  return (data ?? []).map((row) => mapAmbassador(row as unknown as AmbassadorRow));
}

// Super Admin permission edits. `permissions` is a partial patch — only the
// keys provided are changed.
export async function updatePermissions(
  code: string,
  updates: {
    permissions?: Partial<AccountPermissions>;
    isSuperAdmin?: boolean;
    vendorSlug?: string | null;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.permissions?.ambassador !== undefined) patch.perm_ambassador = updates.permissions.ambassador;
  if (updates.permissions?.vendor !== undefined) patch.perm_vendor = updates.permissions.vendor;
  if (updates.permissions?.music !== undefined) patch.perm_music = updates.permissions.music;
  if (updates.permissions?.ssbd !== undefined) patch.perm_ssbd = updates.permissions.ssbd;
  if (updates.permissions?.eventsAdmin !== undefined) patch.perm_events_admin = updates.permissions.eventsAdmin;
  if (updates.isSuperAdmin !== undefined) patch.is_super_admin = updates.isSuperAdmin;
  if (updates.vendorSlug !== undefined) patch.vendor_slug = updates.vendorSlug || null;

  if (Object.keys(patch).length === 0) return;

  const { error } = await getSupabase().from("ambassadors").update(patch).eq("code", code.trim().toUpperCase());

  if (error) throw new Error(`Failed to update permissions: ${error.message}`);
}

export async function createLink(ambassadorCode: string, label: string): Promise<AmbassadorLink> {
  const trimmedLabel = label.trim().slice(0, 40);
  if (!trimmedLabel) {
    throw new Error("Link label is required");
  }

  const slug = await generateLinkSlug(ambassadorCode, trimmedLabel);
  const { data, error } = await getSupabase()
    .from("links")
    .insert({
      id: `link_${slug.toLowerCase()}`,
      ambassador_code: ambassadorCode,
      label: trimmedLabel,
      slug,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create link: ${error?.message ?? "unknown error"}`);
  }

  return mapLink(data as LinkRow);
}

export async function getLinkBySlug(
  slug: string,
): Promise<{ ambassadorCode: string; slug: string; label: string } | undefined> {
  const { data, error } = await getSupabase()
    .from("links")
    .select("slug, label, ambassador_code")
    .eq("slug", slug.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Failed to look up link by slug: ${error.message}`);

  return data ? { ambassadorCode: data.ambassador_code, slug: data.slug, label: data.label } : undefined;
}

export async function recordLinkClick(slug: string): Promise<boolean> {
  const { error } = await getSupabase().rpc("increment_link_clicks", { p_slug: slug });
  return !error;
}

export async function setPayout(code: string, payout: PayoutSettings): Promise<boolean> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ payout_method: payout.method, payout_destination: payout.destination })
    .eq("code", code);

  return !error;
}

// Backs the Settings tab's profile form. `email` is optional to change —
// when provided it's the caller's job (updateAccountInfoAction) to have
// already checked it isn't taken by a different account, same as signup.
export async function updateAccountInfo(
  code: string,
  updates: { name: string; email: string; instagram?: string | null },
): Promise<void> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({
      name: updates.name,
      email: updates.email.trim().toLowerCase(),
      instagram: updates.instagram?.trim() || null,
    })
    .eq("code", code.trim().toUpperCase());

  if (error) throw new Error(`Failed to update account info: ${error.message}`);
}

export async function updatePasswordHash(code: string, passwordHash: string): Promise<void> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ password_hash: passwordHash })
    .eq("code", code.trim().toUpperCase());

  if (error) throw new Error(`Failed to update password: ${error.message}`);
}

// The Settings tab's "delete account" action — deactivates the login
// without touching historical data. Orders, links, click stats, and RSVPs
// tied to this code all stay exactly as they are; only deleted_at getting
// set (checked by getCredentialsByCode/getCredentialsByEmail) is what
// actually blocks this account from signing back in.
export async function deactivateAccount(code: string): Promise<void> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ deleted_at: new Date().toISOString() })
    .eq("code", code.trim().toUpperCase());

  if (error) throw new Error(`Failed to delete account: ${error.message}`);
}

// Links an ambassador account to a vendor/artist slug (see
// supabase/migrations/0004_vendor_slug.sql), so their dashboard's Vendor
// tab can show real sales/inventory scoped to that vendor's products.
export async function setVendorSlug(code: string, vendorSlug: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ vendor_slug: vendorSlug })
    .eq("code", code.trim().toUpperCase());

  return !error;
}

// Caches the Square Customer id matched by email so the portal page
// doesn't need to re-search Square's Customers API on every load. Best
// effort — a failure here shouldn't block anything, so callers just log.
export async function setSquareCustomerId(code: string, squareCustomerId: string): Promise<boolean> {
  const { error } = await getSupabase()
    .from("ambassadors")
    .update({ square_customer_id: squareCustomerId })
    .eq("code", code.trim().toUpperCase());

  return !error;
}

export function getStats(ambassador: Ambassador): AmbassadorStats {
  const clicks = ambassador.links.reduce((sum, l) => sum + l.clicks, 0);
  const orderCount = ambassador.orders.length;
  const totalSales = ambassador.orders.reduce((sum, o) => sum + o.saleAmount, 0);
  const totalCommission = ambassador.orders.reduce((sum, o) => sum + o.commission, 0);
  return { clicks, orderCount, totalSales, totalCommission };
}
