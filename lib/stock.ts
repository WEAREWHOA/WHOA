import type { Product, ProductVariation } from "./types";

/**
 * Whether a thing can be bought off the shelf, and what to call it when
 * it cannot.
 *
 * One module because four surfaces ask the same question and used to
 * answer it three different ways: the shop grid, the product page, the
 * featured ordering and the checkout's own last look at Square. Where
 * two of those disagreed, a card said "Sold out" over a button that
 * added it to the cart anyway.
 *
 * Imports nothing but the types, so it is safe in the browser bundle and
 * on the server.
 */

/**
 * How long a pre-order takes. Deliberately vague about the upper end:
 * these are made by hand, and a date promised at checkout by a function
 * that cannot see the workbench is a date the shop has to break.
 */
export const PREORDER_LEAD_TIME =
  "Made to order, so give us two to three weeks before it ships.";

/** The word for an out-of-stock item, now that it can still be bought. */
export const PREORDER_LABEL = "Pre-order";

/**
 * What goes on the Square line item. Shouted, because it is read off a
 * packing screen next to a dozen lines that are ready to go out.
 */
export const PREORDER_NOTE = "PRE-ORDER — not in stock, needs making";

/**
 * Null stock means Square is not tracking this variation, which is
 * unlimited rather than nothing. A count at or below zero means none on
 * the shelf -- below because Square lets a sale run stock negative
 * (selling past zero at the till is not blocked), so an oversold
 * variation reads as the minus figure it really is.
 */
export function variationInStock(variation: ProductVariation): boolean {
  return variation.inStock == null || variation.inStock > 0;
}

/**
 * Whether every variation is off the shelf.
 *
 * This replaces summing the counts and asking whether the total came to
 * zero. Summing is the wrong question and gave the wrong answer twice
 * over: a product with one oversold variation at -3 and another with 2
 * genuinely in stock summed to -1 and showed as sold out, while the
 * product page quite correctly let you buy the one that was there. In
 * the other direction an untracked variation counted as a single unit
 * and could mask a sibling that had actually run out.
 *
 * A product with no variations at all is not sold out. There is nothing
 * to be out of, and Square has items like that.
 */
export function isOutOfStock(product: Product): boolean {
  if (product.variations.length === 0) return false;
  return !product.variations.some(variationInStock);
}

/**
 * How many are on the shelf, or null when nothing is tracked.
 *
 * Oversold variations are floored at zero rather than subtracted from
 * their siblings: a customer reading "2 in stock" wants to know how many
 * they can have, not the net of one variation's debt against another's
 * surplus.
 */
export function availableStock(product: Product): number | null {
  if (product.variations.length === 0) return null;
  // One untracked variation makes the whole total unknowable, and an
  // unknowable total must not be printed. Counting only the tracked ones
  // would show "0 in stock" on a product whose other size is unlimited
  // and perfectly buyable, which reads as sold out while the button says
  // Add to cart -- the same class of contradiction this module exists to
  // remove.
  if (product.variations.some((v) => v.inStock == null)) return null;
  return product.variations.reduce((sum, v) => sum + Math.max(0, v.inStock ?? 0), 0);
}

/**
 * Whether this many of a variation would have to be made rather than
 * picked off the shelf. Used to mark the line as a pre-order on the
 * Square order, so whoever packs it knows before they go looking.
 *
 * Undefined means Square tracks no inventory for it, which is unlimited,
 * so nothing is ever a pre-order.
 */
export function isPreorderQuantity(available: number | undefined, quantity: number): boolean {
  if (available === undefined) return false;
  return quantity > available;
}
