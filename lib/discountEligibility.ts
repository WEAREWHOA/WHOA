/**
 * Whether a product takes ambassador/promo discounts, read off the marker
 * in its own Square description.
 *
 * WHOA's own goods carry a line like:
 *   ✅ ELIGIBLE for WHOA discounts OR purchase with WHOA gift card ✅
 * and everything else (Art Collective artists' work, consignment, guest
 * brands) carries:
 *   🚫 NOT ELIGIBLE for WHOA discounts OR purchase with WHOA gift card 🚫
 *
 * The description is the right home for this because it's already where
 * the rule is stated to the customer — one place to edit in Square, and
 * what the shopper reads is what the checkout enforces. The previous rule
 * keyed off Square's "Art Collective" category, which only worked for
 * exactly that one group and silently discounted anything else that
 * shouldn't have been.
 *
 * Two deliberate choices:
 *
 * - **Unmarked means not eligible.** A product nobody has labelled yet
 *   doesn't get discounted. Erring the other way gives money away on
 *   items that were never meant to be included, and the mistake is
 *   invisible until the numbers are reconciled.
 * - **The negative wins.** "NOT ELIGIBLE" contains the word "ELIGIBLE", so
 *   it is checked first; a description carrying both markers is treated as
 *   excluded.
 *
 * Matching is deliberately loose — the emoji alone, or the words alone,
 * are each enough — so re-typed or re-formatted descriptions keep working.
 */

/** 🚫, or "not eligible"/"ineligible" in any spacing or casing. */
const EXCLUDED = /🚫|\bNOT\s+ELIGIBLE\b|\bINELIGIBLE\b|\bNON[- ]?ELIGIBLE\b/;

/** ✅, or a bare "eligible" that survived the exclusion test above. */
const INCLUDED = /✅|\bELIGIBLE\b/;

export function isDiscountEligible(description: string | null | undefined): boolean {
  if (!description) return false;

  const text = description.toUpperCase();
  if (EXCLUDED.test(text)) return false;
  return INCLUDED.test(text);
}
