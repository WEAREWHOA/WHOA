/**
 * Whether a product takes ambassador/promo discounts, read off its own
 * Square description.
 *
 * EXCLUSION ONLY. Everything is eligible unless its description carries
 *
 *   🚫 NOT ELIGIBLE for WHOA discounts OR purchase with WHOA gift card 🚫
 *
 * which is the line staff already read off a tag in the shop. One
 * marker, one meaning, in the place the rule is already written down
 * for a customer.
 *
 * It used to be the other way round -- eligible only with a ✅ marker,
 * unmarked meaning no -- and that was wrong for this shop in a way that
 * cost real money. The ✅ line had been deleted from a lot of products
 * to tidy up how the description read, long before it became the
 * website's trigger, so items everybody knew qualified were quietly
 * taking no discount at all. A rule whose safe default is "no" is only
 * safe when somebody is maintaining the markers; here the markers were
 * maintained for the exclusions and nothing else.
 *
 * So the default is yes, and the one thing anybody has to remember is
 * to put the 🚫 line on work that is not ours to discount -- which is
 * the thing they were already doing.
 *
 * Matching stays deliberately loose: the emoji alone, or the words
 * alone, are each enough, so a re-typed or re-formatted description
 * keeps excluding what it meant to exclude.
 */

/** 🚫, or "not eligible"/"ineligible" in any spacing or casing. */
const EXCLUDED = /🚫|\bNOT\s+ELIGIBLE\b|\bINELIGIBLE\b|\bNON[- ]?ELIGIBLE\b/;

export function isDiscountEligible(description: string | null | undefined): boolean {
  // No description at all is eligible, like everything else. A product
  // nobody has written anything about is far more likely to be an
  // ordinary WHOA item than somebody's consignment piece, and the
  // consignment pieces are the ones that get the marker.
  if (!description) return true;

  return !EXCLUDED.test(description.toUpperCase());
}
