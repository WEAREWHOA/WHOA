/**
 * The rules for a promo code an ambassador picks for themselves.
 *
 * Kept apart from lib/store.ts so the rules can be read and tested
 * without a database: everything here is a pure function of the string
 * somebody typed. Whether the code is already taken is a separate
 * question, and the only one that needs Supabase.
 */

export const PROMO_CODE_MIN = 3;
export const PROMO_CODE_MAX = 20;

/**
 * Codes nobody gets to take.
 *
 * Exact matches only. The point is to stop a code reading as something
 * WHOA itself issued ("SALE", "FREESHIP") or as the brand ("WHOA",
 * "WHOADEGA"), since a customer has no way to tell an ambassador's code
 * from an official one. A compound like WHOAJANE is fine and is left
 * alone: it is plainly somebody's own.
 */
const RESERVED = new Set([
  "WHOA",
  "WHOADEGA",
  "WEAREWHOA",
  "ADMIN",
  "SUPERADMIN",
  "STAFF",
  "TEAM",
  "SHOP",
  "STORE",
  "CART",
  "CHECKOUT",
  "PORTAL",
  "LOGIN",
  "SIGNUP",
  "TEST",
  "DEMO",
  "FREE",
  "FREESHIP",
  "SHIPPING",
  "SALE",
  "DISCOUNT",
  "PROMO",
  "COUPON",
  "GIFT",
  "GIFTCARD",
  "REFUND",
  "VOID",
  "NULL",
  "UNDEFINED",
]);

export type PromoCodeRejection =
  | "empty"
  | "short"
  | "long"
  | "charset"
  | "letters"
  | "reserved";

export type PromoCodeCheck =
  | { ok: true; code: string }
  | { ok: false; reason: PromoCodeRejection };

/**
 * What the ambassador typed, as it would be stored.
 *
 * Upper-cased because every slug in the links table is, and
 * getLinkBySlug upper-cases what the customer types at checkout, so
 * case never has to match. Whitespace inside is squeezed out rather
 * than rejected: somebody typing "JANE VIBES" meant JANEVIBES, and
 * refusing it over a space they cannot see in a text field is just
 * annoying. Anything else invalid is reported instead of stripped, so
 * they find out they got a different code than they asked for now and
 * not off a printed flyer.
 */
export function normalizePromoCode(input: string): string {
  return input.replace(/\s+/g, "").trim().toUpperCase();
}

export function checkPromoCode(input: string): PromoCodeCheck {
  const code = normalizePromoCode(input);

  if (!code) return { ok: false, reason: "empty" };
  if (code.length < PROMO_CODE_MIN) return { ok: false, reason: "short" };
  if (code.length > PROMO_CODE_MAX) return { ok: false, reason: "long" };
  if (!/^[A-Z0-9]+$/.test(code)) return { ok: false, reason: "charset" };
  // An all-digit code reads as a quantity or a price next to a cart
  // total, and "use code 2025" is a sentence nobody parses as a code.
  if (!/[A-Z]/.test(code)) return { ok: false, reason: "letters" };
  if (RESERVED.has(code)) return { ok: false, reason: "reserved" };

  return { ok: true, code };
}

/** Why a code was turned down, in words an ambassador can act on. */
export const PROMO_CODE_REJECTION_TEXT: Record<PromoCodeRejection, string> = {
  empty: "Type the code you want first.",
  short: `A code needs at least ${PROMO_CODE_MIN} characters.`,
  long: `Keep it to ${PROMO_CODE_MAX} characters or fewer.`,
  charset: "Letters and numbers only, no spaces, dashes or symbols.",
  letters: "A code needs at least one letter in it, not just numbers.",
  reserved: "That one is reserved. Pick something that reads as yours.",
};
