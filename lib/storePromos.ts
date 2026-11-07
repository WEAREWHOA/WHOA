import { getSupabase } from "@/lib/supabase";
import { checkPromoCode, normalizePromoCode } from "@/lib/promoCodes";

/**
 * Codes WHOA itself issues, as opposed to an ambassador's own.
 *
 * The two are different things that a customer types into the same
 * box, so they share a namespace and are checked against each other
 * at creation time (see createStorePromo): a code must be one or the
 * other, never both, or which discount applies would depend on which
 * lookup ran first.
 *
 * Nothing in here decides commission. A store promo changes what the
 * customer pays and nothing else; who gets credited for the sale is
 * still the referral cookie's business, exactly as before.
 */

export interface StorePromo {
  code: string;
  percent: number;
  label: string | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  redemptions: number;
  active: boolean;
  createdAt: string;
  note: string | null;
}

export type PromoRefusal =
  | "unknown"
  | "inactive"
  | "not-started"
  | "expired"
  | "used-up";

export const PROMO_REFUSAL_TEXT: Record<PromoRefusal, string> = {
  unknown: "That code isn't valid.",
  inactive: "That code isn't active.",
  "not-started": "That code hasn't started yet.",
  expired: "That code has expired.",
  "used-up": "That code has been fully claimed.",
};

type PromoRow = {
  code: string;
  percent: number;
  label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_redemptions: number | null;
  redemptions: number;
  active: boolean;
  created_at: string;
  note: string | null;
};

function fromRow(row: PromoRow): StorePromo {
  return {
    code: row.code,
    percent: row.percent,
    label: row.label,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxRedemptions: row.max_redemptions,
    redemptions: row.redemptions,
    active: row.active,
    createdAt: row.created_at,
    note: row.note,
  };
}

/**
 * Is this code good right now?
 *
 * Pure, so the rule can be tested without a database and so the same
 * answer is given when the code is typed and again when the card is
 * charged. `now` is a parameter for the same reason: a rule that reads
 * the clock itself cannot be tested at a boundary.
 */
export function promoUsable(
  promo: StorePromo,
  now: Date = new Date(),
): { ok: true } | { ok: false; reason: PromoRefusal } {
  if (!promo.active) return { ok: false, reason: "inactive" };

  const at = now.getTime();
  if (promo.startsAt && at < new Date(promo.startsAt).getTime()) {
    return { ok: false, reason: "not-started" };
  }
  if (promo.endsAt && at >= new Date(promo.endsAt).getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) {
    return { ok: false, reason: "used-up" };
  }

  return { ok: true };
}

/** The row, whether or not it is currently usable. */
export async function getStorePromo(code: string): Promise<StorePromo | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;

  const { data, error } = await getSupabase()
    .from("store_promos")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up store promo: ${error.message}`);
  return data ? fromRow(data as PromoRow) : null;
}

/**
 * The code and its percentage, only if it can be used right now.
 *
 * What checkout calls. Returns null rather than throwing on a database
 * hiccup: a promo lookup failing should cost the customer their
 * discount, not their ability to buy anything.
 */
export async function usableStorePromo(
  code: string | null | undefined,
): Promise<{ code: string; percent: number; label: string | null } | null> {
  if (!code) return null;

  const promo = await getStorePromo(code).catch((err) => {
    console.error("Store promo lookup failed:", err);
    return null;
  });
  if (!promo) return null;
  if (!promoUsable(promo).ok) return null;

  return { code: promo.code, percent: promo.percent, label: promo.label };
}

/**
 * Count a completed sale against a code.
 *
 * Called after the card has been charged, so it never refuses: the
 * money is already taken and a counter is not a reason to unwind a
 * sale. An overshoot past the cap is logged rather than hidden.
 */
export async function recordStorePromoUse(code: string): Promise<void> {
  const { data, error } = await getSupabase()
    .rpc("record_store_promo_use", { p_code: normalizePromoCode(code) })
    .maybeSingle<{ redemptions: number; within_cap: boolean }>();

  if (error) {
    console.error("Failed to count a store promo use for %s:", code, error);
    return;
  }
  if (data && !data.within_cap) {
    console.warn(
      "Store promo %s went past its cap (now %d uses). Concurrent checkouts; honoured.",
      code,
      data.redemptions,
    );
  }
}

export type CreatePromoResult =
  | { ok: true; promo: StorePromo }
  | { ok: false; error: string };

/**
 * Issue a code.
 *
 * Refuses a code that an ambassador already owns. The two kinds share
 * one input box at checkout, so a collision would mean the discount a
 * customer gets depends on lookup order, and the ambassador would
 * quietly stop being paid for their own code.
 */
export async function createStorePromo(input: {
  code: string;
  percent: number;
  label?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  createdBy?: string | null;
  note?: string | null;
}): Promise<CreatePromoResult> {
  // Same shape rules as an ambassador's code, since they live in one
  // namespace and a customer cannot tell them apart.
  const check = checkPromoCode(input.code);
  if (!check.ok) return { ok: false, error: `Bad code: ${check.reason}` };
  const code = check.code;

  if (!Number.isInteger(input.percent) || input.percent < 1 || input.percent > 100) {
    return { ok: false, error: "percent must be a whole number from 1 to 100." };
  }
  if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
    return { ok: false, error: "endsAt must be after startsAt." };
  }

  const supabase = getSupabase();

  const { data: clash, error: clashError } = await supabase
    .from("links")
    .select("slug, ambassador_code")
    .eq("slug", code)
    .maybeSingle();
  if (clashError) {
    return { ok: false, error: `Couldn't check the code against ambassador codes: ${clashError.message}` };
  }
  if (clash) {
    return {
      ok: false,
      error: `${code} is already ${clash.ambassador_code}'s code. Pick another.`,
    };
  }

  const { data, error } = await supabase
    .from("store_promos")
    .insert({
      code,
      percent: input.percent,
      label: input.label ?? null,
      starts_at: input.startsAt ?? null,
      ends_at: input.endsAt ?? null,
      max_redemptions: input.maxRedemptions ?? null,
      created_by: input.createdBy ?? null,
      note: input.note ?? null,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: `${code} already exists.` };
    return { ok: false, error: error.message };
  }

  return { ok: true, promo: fromRow(data as PromoRow) };
}

export async function listStorePromos(): Promise<StorePromo[]> {
  const { data, error } = await getSupabase()
    .from("store_promos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list store promos: ${error.message}`);
  return (data as PromoRow[]).map(fromRow);
}

export async function setStorePromoActive(code: string, active: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("store_promos")
    .update({ active })
    .eq("code", normalizePromoCode(code));

  if (error) throw new Error(`Failed to update store promo: ${error.message}`);
}
