import type { CartLine } from "@/lib/types";

// The parts of a Square order that decide what it costs — line items and
// the ambassador discount.
//
// This exists so the price we quote and the price we charge are built by
// the same code. They used to be two different calculations: the browser
// worked out its own subtotal and 15% discount for display, while Square
// priced the real order from the catalog. Any disagreement between them —
// an Art Collective item that doesn't discount, a tax configured in
// Square — showed up as a customer being charged something other than the
// number they agreed to.

export const AMBASSADOR_DISCOUNT_UID = "ambassador-discount";
export const SHIPPING_UID = "shipping";

/** One place, because three calculations depend on it: the discount Square
 *  applies, the subtotal the shipping tier is chosen from when quoting,
 *  and the same subtotal when charging. */
export const AMBASSADOR_DISCOUNT_PERCENT = 15;

export interface OrderPricing {
  lineItems: {
    catalogObjectId: string;
    quantity: string;
    appliedDiscounts?: { discountUid: string }[];
  }[];
  discounts?: {
    uid: string;
    name: string;
    type: "FIXED_PERCENTAGE";
    percentage: string;
    scope: "LINE_ITEM";
  }[];
  /**
   * Shipping, as a service charge rather than a line item.
   *
   * A line item would be merchandise: the ambassador discount would come
   * off it, and it would count towards the subtotal that decides its own
   * tier. A SUBTOTAL_PHASE service charge sits outside both.
   */
  serviceCharges?: {
    uid: string;
    name: string;
    amountMoney: { amount: bigint; currency: "USD" };
    calculationPhase: "SUBTOTAL_PHASE";
    taxable: boolean;
  }[];
}

export function buildOrderPricing({
  lines,
  ambassadorCode,
  excludedProductIds,
  shippingCents,
}: {
  lines: CartLine[];
  ambassadorCode?: string;
  /**
   * Worked out server-side from the destination and the discounted
   * merchandise subtotal — never taken from the browser, which would let
   * anyone set their own postage to zero.
   */
  shippingCents?: number;
  /**
   * Art Collective products, which never take the ambassador discount.
   * Resolved from Square's own category data by the caller, never from
   * whatever the browser's cart happens to claim.
   */
  excludedProductIds: ReadonlySet<string>;
}): OrderPricing {
  const shipping = Math.max(0, Math.round(shippingCents ?? 0));

  return {
    serviceCharges: shipping > 0
      ? [
          {
            uid: SHIPPING_UID,
            name: "Shipping",
            amountMoney: { amount: BigInt(shipping), currency: "USD" as const },
            calculationPhase: "SUBTOTAL_PHASE" as const,
            // Shipping taxability is a per-jurisdiction question and
            // Square is the one configured for it — but taxing postage
            // by default would overcharge everywhere it isn't taxable,
            // which is the worse way to be wrong.
            taxable: false,
          },
        ]
      : undefined,
    lineItems: lines.map((line) => ({
      catalogObjectId: line.variationId,
      quantity: String(line.quantity),
      appliedDiscounts:
        ambassadorCode && !excludedProductIds.has(line.productId)
          ? [{ discountUid: AMBASSADOR_DISCOUNT_UID }]
          : undefined,
    })),
    discounts: ambassadorCode
      ? [
          {
            uid: AMBASSADOR_DISCOUNT_UID,
            name: `WHOA Ambassador (${ambassadorCode})`,
            type: "FIXED_PERCENTAGE",
            percentage: String(AMBASSADOR_DISCOUNT_PERCENT),
            scope: "LINE_ITEM",
          },
        ]
      : undefined,
  };
}

/**
 * What the merchandise comes to after the ambassador discount, before tax
 * and before postage.
 *
 * This is the number the shipping tier is chosen from, so the quote and
 * the charge have to agree on it exactly — hence one function rather than
 * the same three lines written out in both places. An ambassador order
 * that drops below a threshold pays the higher rate, which is what a
 * customer doing the arithmetic themselves would expect.
 */
export function discountedMerchandiseCents({
  lines,
  ambassadorCode,
  excludedProductIds,
}: {
  lines: CartLine[];
  ambassadorCode?: string;
  excludedProductIds: ReadonlySet<string>;
}): number {
  const gross = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const discountable = ambassadorCode
    ? lines
        .filter((l) => !excludedProductIds.has(l.productId))
        .reduce((sum, l) => sum + l.priceCents * l.quantity, 0)
    : 0;
  return gross - Math.round((discountable * AMBASSADOR_DISCOUNT_PERCENT) / 100);
}

/** What the checkout shows the customer before they pay. */
export interface CheckoutQuote {
  /** Undiscounted, pre-tax, straight from the cart lines. */
  subtotalCents: number;
  discountCents: number;
  /** Whatever tax Square is configured to charge on these items. */
  taxCents: number;
  /** Postage for this destination and basket. Zero is a real answer —
   *  it means they qualified for free shipping, not that it's unknown. */
  shippingCents: number;
  /** Square's own total — the number that actually gets charged. */
  totalCents: number;
}
