import { createHash, randomInt } from "crypto";
import { getSupabase } from "./supabase";

/**
 * The WHOA card: store credit we hold ourselves.
 *
 * Square holds none of it. The ledger in 0058 is the whole record and
 * everything here is a thin way of reaching it: every balance change
 * goes through adjust_wallet_balance, which writes the movement and the
 * balance in one statement, so there is no path that moves money
 * without leaving a row explaining it.
 *
 * The metal card carries the same QR as every other, so the card
 * itself proves nothing. What connects "paid ten dollars at the till"
 * to an account is a claim code the till issues, redeemed here.
 *
 * Nothing in this file decides who is allowed to do a thing. That is
 * the caller's job, and it is worth saying because a function here
 * taking an account code looks like it is checking one. It is
 * recording one.
 */

/**
 * The alphabet codes are drawn from.
 *
 * No 0/O, no 1/I/L, no 5/S, no 8/B. These get read off a receipt in a
 * shop and typed into a phone, and every pair above is a support
 * email waiting to happen.
 */
const ALPHABET = "ACDEFGHJKMNPQRTUVWXYZ2346789";

function randomBlock(length: number): string {
  let out = "";
  // randomInt, not Math.random: these are bearer tokens, and a
  // predictable generator is a printed run somebody can work out.
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** What somebody shows at the till. Prefixed so it is obviously ours. */
export function generateCreditCode(): string {
  return `WHOA-${randomBlock(4)}-${randomBlock(4)}`;
}

/** A one-time code the till hands over when a card is sold. */
export function generateClaimCode(): string {
  return `${randomBlock(4)}-${randomBlock(4)}`;
}

/** Spaces, dashes and case all go: nobody types a code back the way it
 *  was printed, and the lookup must not care. */
export function normalizeCode(input: string): string {
  return String(input ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * The lookup key for a claim code, and the only form that reaches the
 * database.
 *
 * SHA-256 rather than bcrypt, and the reason is the opposite of the
 * usual one: a password is checked against one known row so it can
 * afford to be slow, while this IS the lookup and has to hash the same
 * way every time. What makes it safe is the entropy of the code, not
 * the cost of hashing. Nobody runs a dictionary at a random eight
 * characters from this alphabet.
 */
export function hashClaimCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

export function lastFour(code: string): string {
  return normalizeCode(code).slice(-4);
}

export type WalletStatus = "active" | "frozen" | "closed";
export type WalletReason = "card-purchase" | "topup" | "purchase" | "refund" | "adjustment";

export const REASON_LABELS: Record<WalletReason, string> = {
  "card-purchase": "Card bought in store",
  topup: "Topped up",
  purchase: "Spent",
  refund: "Refunded",
  adjustment: "Adjusted",
};

export interface Wallet {
  id: string;
  ambassadorCode: string;
  creditCode: string;
  balanceCents: number;
  status: WalletStatus;
  /** When they bought a WHOA card. Null means credit but no membership. */
  memberSince: string | null;
  createdAt: string;
}

export interface WalletMovement {
  id: string;
  deltaCents: number;
  balanceAfterCents: number;
  reason: WalletReason;
  reference: string | null;
  actor: string | null;
  note: string | null;
  createdAt: string;
}

interface WalletRow {
  id: string;
  ambassador_code: string;
  credit_code: string;
  balance_cents: number;
  status: WalletStatus;
  member_since: string | null;
  created_at: string;
}

const WALLET_COLUMNS =
  "id, ambassador_code, credit_code, balance_cents, status, member_since, created_at";

function toWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    ambassadorCode: row.ambassador_code,
    creditCode: row.credit_code,
    balanceCents: row.balance_cents,
    status: row.status,
    memberSince: row.member_since,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Reading
// ─────────────────────────────────────────────────────────────────────

/** This account's wallet, or nothing if it has never been opened. */
export async function walletForAccount(ambassadorCode: string): Promise<Wallet | null> {
  const { data, error } = await getSupabase()
    .from("whoa_wallets")
    .select(WALLET_COLUMNS)
    .eq("ambassador_code", ambassadorCode.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(`Couldn't read that card: ${error.message}`);
  return data ? toWallet(data as WalletRow) : null;
}

/** The card behind a code read out at the till. */
export async function walletByCreditCode(creditCode: string): Promise<Wallet | null> {
  const flat = normalizeCode(creditCode);
  if (flat.length < 8) return null;

  // Stored with its dashes, so the lookup is on the formatted form
  // rebuilt from whatever was typed.
  const formatted = `WHOA-${flat.slice(4, 8)}-${flat.slice(8, 12)}`;

  const { data, error } = await getSupabase()
    .from("whoa_wallets")
    .select(WALLET_COLUMNS)
    .eq("credit_code", formatted)
    .maybeSingle();

  if (error) throw new Error(`Couldn't look up that code: ${error.message}`);
  return data ? toWallet(data as WalletRow) : null;
}

/**
 * Whether to show the tab.
 *
 * Its own query rather than reusing walletForAccount, because this runs
 * on every portal page load and only needs to know whether a row
 * exists. Never throws: a database hiccup should cost the tab for a
 * minute, not the whole dashboard.
 */
export async function hasWallet(ambassadorCode: string): Promise<boolean> {
  try {
    const { count, error } = await getSupabase()
      .from("whoa_wallets")
      .select("id", { count: "exact", head: true })
      .eq("ambassador_code", ambassadorCode.trim().toUpperCase());

    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  } catch (err) {
    console.error("hasWallet failed:", err);
    return false;
  }
}

/** A card's statement, newest first. */
export async function walletMovements(walletId: string, limit = 50): Promise<WalletMovement[]> {
  const { data, error } = await getSupabase()
    .from("whoa_wallet_transactions")
    .select("id, delta_cents, balance_after_cents, reason, reference, actor, note, created_at")
    .eq("wallet_id", walletId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Couldn't read that card's history: ${error.message}`);

  return ((data ?? []) as {
    id: string;
    delta_cents: number;
    balance_after_cents: number;
    reason: WalletReason;
    reference: string | null;
    actor: string | null;
    note: string | null;
    created_at: string;
  }[]).map((row) => ({
    id: row.id,
    deltaCents: row.delta_cents,
    balanceAfterCents: row.balance_after_cents,
    reason: row.reason,
    reference: row.reference,
    actor: row.actor,
    note: row.note,
    createdAt: row.created_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Writing
// ─────────────────────────────────────────────────────────────────────

/**
 * Give an account its card, or hand back the one it has.
 *
 * Called the first time somebody signed in reaches /whoa-card, so a
 * code exists to show them before any money does. Creating it costs
 * nothing and carries no value, which is what makes it safe to do on
 * sight rather than on purchase.
 */
export async function ensureWallet(ambassadorCode: string): Promise<Wallet> {
  const { data, error } = await getSupabase().rpc("ensure_wallet", {
    p_ambassador_code: ambassadorCode.trim().toUpperCase(),
    p_credit_code: generateCreditCode(),
  });

  if (error) throw new Error(`Couldn't open that card: ${error.message}`);

  const row = (data as {
    wallet_id: string;
    credit_code: string;
    balance_cents: number;
    member_since: string | null;
  }[] | null)?.[0];
  if (!row) throw new Error("ensure_wallet returned nothing");

  return {
    id: row.wallet_id,
    ambassadorCode: ambassadorCode.trim().toUpperCase(),
    creditCode: row.credit_code,
    balanceCents: row.balance_cents,
    status: "active",
    memberSince: row.member_since,
    createdAt: new Date().toISOString(),
  };
}

export type RedeemOutcome =
  | "redeemed"
  | "used"
  | "expired"
  | "unknown"
  | "frozen"
  | "closed"
  | "failed";

export interface RedeemResult {
  outcome: RedeemOutcome;
  valueCents: number;
  balanceCents: number;
  /** True when this code was a metal card and has just made them a member. */
  becameMember: boolean;
}

/**
 * Turn a till code into credit on this account's card.
 *
 * A code that cannot land, because the card is frozen, is released
 * again rather than consumed: somebody has paid for it, and a code
 * that took the money nowhere must still be redeemable.
 */
export async function redeemClaim(
  code: string,
  ambassadorCode: string,
  walletId: string,
): Promise<RedeemResult> {
  const flat = normalizeCode(code);
  if (flat.length !== 8) {
    return { outcome: "unknown", valueCents: 0, balanceCents: 0, becameMember: false };
  }

  const { data, error } = await getSupabase().rpc("redeem_wallet_claim", {
    p_code_hash: hashClaimCode(flat),
    p_ambassador_code: ambassadorCode.trim().toUpperCase(),
    p_wallet_id: walletId,
  });

  if (error) throw new Error(`Couldn't redeem that code: ${error.message}`);

  const row = (data as {
    value_cents: number;
    balance_cents: number;
    became_member: boolean;
    outcome: RedeemOutcome;
  }[] | null)?.[0];
  if (!row) return { outcome: "failed", valueCents: 0, balanceCents: 0, becameMember: false };

  return {
    outcome: row.outcome,
    valueCents: row.value_cents,
    balanceCents: row.balance_cents,
    becameMember: row.became_member,
  };
}

export interface AdjustResult {
  balanceCents: number;
  applied: boolean;
  /** insufficient, frozen, closed, no-card, zero or duplicate. */
  refused: string | null;
}

/**
 * Move money on or off a card.
 *
 * Positive adds, negative spends. A spend larger than the balance is
 * refused and reports what is actually there, so a till can say
 * "there is only four dollars on it" rather than "no".
 *
 * The reference is what makes a retry safe: a unique index means one
 * order cannot charge one card twice, and the second attempt surfaces
 * as a duplicate rather than a second debit.
 */
export async function adjustWalletBalance(input: {
  walletId: string;
  deltaCents: number;
  reason: WalletReason;
  reference?: string | null;
  actor?: string | null;
  note?: string | null;
}): Promise<AdjustResult> {
  const { data, error } = await getSupabase().rpc("adjust_wallet_balance", {
    p_wallet_id: input.walletId,
    p_delta_cents: Math.trunc(input.deltaCents),
    p_reason: input.reason,
    p_reference: input.reference ?? null,
    p_actor: input.actor ?? null,
    p_note: input.note ?? null,
  });

  if (error) {
    // A duplicate reference is the idempotency guard working, not a
    // failure. Reported as such so a retried checkout does not show
    // the customer an error for a charge that already went through.
    if (error.code === "23505") {
      return { balanceCents: 0, applied: false, refused: "duplicate" };
    }
    throw new Error(`Couldn't adjust that card: ${error.message}`);
  }

  const row = (data as { balance_cents: number; applied: boolean; reason_refused: string | null }[] | null)?.[0];
  if (!row) throw new Error("adjust_wallet_balance returned nothing");

  return { balanceCents: row.balance_cents, applied: row.applied, refused: row.reason_refused };
}

export interface IssuedClaim {
  code: string;
  valueCents: number;
}

/**
 * Codes for the till.
 *
 * Returns them in the clear, once, because this is the only moment
 * they exist outside somebody's hand: the database keeps only their
 * hashes, so a code not written down here is gone. Whoever calls this
 * is responsible for getting them onto a receipt and not into a log.
 */
export async function issueClaims(input: {
  count: number;
  valueCents: number;
  issuedBy: string;
  /** True for a metal card sold over the counter; false for plain credit. */
  grantsMembership?: boolean;
  note?: string | null;
}): Promise<IssuedClaim[]> {
  const count = Math.max(1, Math.min(Math.trunc(input.count), 200));
  const valueCents = Math.trunc(input.valueCents);
  if (!Number.isFinite(valueCents) || valueCents <= 0) {
    throw new Error("A claim code has to be worth something.");
  }

  const codes = Array.from({ length: count }, generateClaimCode);
  const { error } = await getSupabase().from("whoa_card_claims").insert(
    codes.map((code) => ({
      code_hash: hashClaimCode(code),
      last_four: lastFour(code),
      value_cents: valueCents,
      grants_membership: input.grantsMembership ?? false,
      issued_by: input.issuedBy,
      note: input.note ?? null,
    })),
  );

  if (error) throw new Error(`Couldn't issue those codes: ${error.message}`);
  return codes.map((code) => ({ code, valueCents }));
}

/** What has been handed out and not yet used. */
export async function openClaims(limit = 100): Promise<
  { lastFour: string; valueCents: number; issuedAt: string; issuedBy: string; expiresAt: string }[]
> {
  const { data, error } = await getSupabase()
    .from("whoa_card_claims")
    .select("last_four, value_cents, issued_at, issued_by, expires_at")
    .is("redeemed_at", null)
    .order("issued_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Couldn't read open codes: ${error.message}`);

  return ((data ?? []) as {
    last_four: string;
    value_cents: number;
    issued_at: string;
    issued_by: string;
    expires_at: string;
  }[]).map((row) => ({
    lastFour: row.last_four,
    valueCents: row.value_cents,
    issuedAt: row.issued_at,
    issuedBy: row.issued_by,
    expiresAt: row.expires_at,
  }));
}
