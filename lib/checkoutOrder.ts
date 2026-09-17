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
}

export function buildOrderPricing({
  lines,
  ambassadorCode,
  excludedProductIds,
}: {
  lines: CartLine[];
  ambassadorCode?: string;
  /**
   * Art Collective products, which never take the ambassador discount.
   * Resolved from Square's own category data by the caller, never from
   * whatever the browser's cart happens to claim.
   */
  excludedProductIds: ReadonlySet<string>;
}): OrderPricing {
  return {
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
            percentage: "15",
            scope: "LINE_ITEM",
          },
        ]
      : undefined,
  };
}

/** What the checkout shows the customer before they pay. */
export interface CheckoutQuote {
  /** Undiscounted, pre-tax, straight from the cart lines. */
  subtotalCents: number;
  discountCents: number;
  /** Whatever tax Square is configured to charge on these items. */
  taxCents: number;
  /** Square's own total — the number that actually gets charged. */
  totalCents: number;
}
