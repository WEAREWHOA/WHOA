import type { Product } from "./types";
import { isOutOfStock } from "./stock";

/**
 * The order /shop opens in.
 *
 * Kept out of ShopGrid so it can be exercised without rendering a client
 * component, and because the rule is worth reading on its own. Imports
 * nothing but the Product type, so it stays safe to bundle for the
 * browser.
 *
 * "Featured" used to sort nothing at all, which meant the grid opened in
 * whatever order Square's searchItems happened to return: WHOA's own
 * range scattered through the collective's consignment pieces, and
 * sold-out one-of-ones as likely to lead as anything buyable.
 */

/**
 * Which half of the shop a product belongs to: 0 for WHOA's own goods, 1
 * for the Art Collective's.
 *
 * The caller passes the same category ids the artist filter row is built
 * from, rather than this working them out again, so the pills and the
 * ordering can never disagree about who counts as an artist. A product
 * is the collective's if it carries any category in that set, which
 * covers both the umbrella category and the artist's own nested one.
 */
export function shopBandOf(product: Product, artistCategoryIds: ReadonlySet<string>): number {
  return product.categories.some((c) => artistCategoryIds.has(c.id)) ? 1 : 0;
}

function soldOutRank(product: Product): number {
  return isOutOfStock(product) ? 1 : 0;
}

function updatedRank(product: Product): number {
  if (!product.updatedAt) return 0;
  const parsed = Date.parse(product.updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * WHOA's own goods first, then the collective's; within each, anything
 * buyable before anything sold out, then most recently touched first.
 */
export function compareFeatured(
  a: Product,
  b: Product,
  artistCategoryIds: ReadonlySet<string>,
): number {
  const band = shopBandOf(a, artistCategoryIds) - shopBandOf(b, artistCategoryIds);
  if (band !== 0) return band;

  // Nothing buyable should outrank something that is.
  const stock = soldOutRank(a) - soldOutRank(b);
  if (stock !== 0) return stock;

  // Newest first inside a band, so a fresh drop surfaces without anyone
  // curating the grid by hand. This is Square's own last-modified, which
  // a price or photo edit also bumps, so it means "most recently
  // touched" rather than strictly newest.
  const freshness = updatedRank(b) - updatedRank(a);
  if (freshness !== 0) return freshness;

  // Name then id so the order is fully determined. Without a total
  // tiebreak the grid could reshuffle between revalidations and a
  // shopper coming back would see a different shop for no reason.
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}
