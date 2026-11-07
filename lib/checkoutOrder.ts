import type { CartLine } from "@/lib/types";
import { PREORDER_NOTE } from "@/lib/stock";

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

/**
 * Which discount a cart actually gets.
 *
 * Two can be in play at once: the 15% that comes with an ambassador's
 * code, and a store-wide promo WHOA is running. They never stack. The
 * customer gets whichever is worth more on this particular cart.
 *
 * What does NOT depend on this choice is who gets paid. The ambassador
 * is credited with the sale and earns commission whether or not their
 * discount was the one used, because they are the reason the customer
 * is here either way. That is why nothing in this file touches
 * attribution: the referral is resolved separately and stays resolved.
 */
export type DiscountSource = "ambassador" | "promo";

export interface ChosenDiscount {
  source: DiscountSource;
  /** The ambassador's code, or the promo code, as typed into Square's
   *  discount name and shown on the receipt. */
  code: string;
  percent: number;
  /** What it is worth on this cart. See the rounding note below. */
  cents: number;
  /** "Black Friday", for a promo that has one. */
  label?: string | null;
}

export interface DiscountDecision {
  applied: ChosenDiscount | null;
  /**
   * The one that lost, so the checkout can explain itself rather than
   * silently dropping a code somebody typed. A customer who enters a
   * promo worth less than their ambassador discount should be told
   * their code is still the better deal, not left wondering whether
   * the promo failed.
   */
  passedOver: ChosenDiscount | null;
}

/**
 * Pick the discount, in money rather than in percentages.
 *
 * Both candidates currently apply to the same base (everything without
 * the 🚫 marker), so comparing cents and comparing percentages give the
 * same answer today. Cents is still what gets compared, because it is
 * the question actually being asked, and because the day a promo
 * applies to a different set of items than the ambassador discount
 * does, a percentage comparison starts quietly giving the customer the
 * worse of the two.
 *
 * ROUNDING: this rounds once over the eligible subtotal, while Square
 * rounds per line item, so the two can differ by a cent on a basket
 * with several lines. That is fine for every use here: the real price
 * always comes from Square's own quote, and a cent cannot change which
 * of two discounts is larger in any case anybody will ever run.
 *
 * A tie goes to the ambassador. Same price to the customer either way,
 * and their code is the one with a person behind it.
 */
export function chooseDiscount({
  lines,
  ambassadorCode,
  promo,
  excludedProductIds,
}: {
  lines: CartLine[];
  ambassadorCode?: string | null;
  promo?: { code: string; percent: number; label?: string | null } | null;
  excludedProductIds: ReadonlySet<string>;
}): DiscountDecision {
  const eligibleCents = lines
    .filter((l) => !excludedProductIds.has(l.productId))
    .reduce((sum, l) => sum + l.priceCents * l.quantity, 0);

  const worth = (percent: number) => Math.round((eligibleCents * percent) / 100);

  const ambassador: ChosenDiscount | null = ambassadorCode
    ? {
        source: "ambassador",
        code: ambassadorCode,
        percent: AMBASSADOR_DISCOUNT_PERCENT,
        cents: worth(AMBASSADOR_DISCOUNT_PERCENT),
      }
    : null;

  const storePromo: ChosenDiscount | null = promo
    ? {
        source: "promo",
        code: promo.code,
        percent: promo.percent,
        cents: worth(promo.percent),
        label: promo.label ?? null,
      }
    : null;

  if (!ambassador && !storePromo) return { applied: null, passedOver: null };
  if (!storePromo) return { applied: ambassador, passedOver: null };
  if (!ambassador) return { applied: storePromo, passedOver: null };

  return storePromo.cents > ambassador.cents
    ? { applied: storePromo, passedOver: ambassador }
    : { applied: ambassador, passedOver: storePromo };
}

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
  discount,
  excludedProductIds,
  shippingCents,
  preorderVariationIds,
}: {
  lines: CartLine[];
  /**
   * The winner from chooseDiscount, or null for no discount at all.
   *
   * One field rather than an ambassador code and a promo code, because
   * only one of them can ever be on an order and a shape that can hold
   * both is a shape where somebody eventually sets both.
   */
  discount?: ChosenDiscount | null;
  /**
   * Worked out server-side from the destination and the discounted
   * merchandise subtotal — never taken from the browser, which would let
   * anyone set their own postage to zero.
   */
  shippingCents?: number;
   /**
   * Art Collective and consignment products, which take no WHOA
   * discount of any kind: not the ambassador's, not a store promo.
   * Resolved from Square's own category data by the caller, never from
   * whatever the browser's cart happens to claim.
   */
  excludedProductIds: ReadonlySet<string>;
  /**
   * Lines being made rather than picked off the shelf. Carried onto the
   * Square line item as a note, because the order in Square is what the
   * shop packs from and an item that has to be made first is the one
   * thing about it they cannot work out from the count.
   */
  preorderVariationIds?: ReadonlySet<string>;
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
      note: preorderVariationIds?.has(line.variationId) ? PREORDER_NOTE : undefined,
      appliedDiscounts:
        discount && !excludedProductIds.has(line.productId)
          ? [{ discountUid: AMBASSADOR_DISCOUNT_UID }]
          : undefined,
    })),
    discounts: discount
      ? [
          {
            uid: AMBASSADOR_DISCOUNT_UID,
            // What shows on the Square receipt and in the shop's own
            // order history, so it has to say which of the two this
            // was. An order that took a promo instead of the BA's 15%
            // still carries the BA's code in the orders table; reading
            // "WHOA Ambassador" on the receipt of a sale that got a
            // promo discount is how somebody reconciling the books
            // ends up chasing a bug that is not there.
            name:
              discount.source === "ambassador"
                ? `WHOA Ambassador (${discount.code})`
                : `${discount.label || "Promo"} (${discount.code})`,
            type: "FIXED_PERCENTAGE",
            percentage: String(discount.percent),
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
  discount,
}: {
  lines: CartLine[];
  /** The winner from chooseDiscount, which already knows what it is
   *  worth on this cart. Subtracting its own figure rather than working
   *  the percentage out a second time is what keeps the shipping tier,
   *  the quote and the charge from disagreeing. */
  discount?: ChosenDiscount | null;
}): number {
  const gross = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  return Math.max(0, gross - (discount?.cents ?? 0));
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
  /** Which discount won, so the summary can name it rather than
   *  showing a bare "-$25.00" the customer has to account for. */
  discount?: {
    source: DiscountSource;
    code: string;
    percent: number;
    label: string | null;
  } | null;
  /** The one that lost. Shown as reassurance, not as an error. */
  passedOver?: { source: DiscountSource; code: string; percent: number } | null;
  /** The ambassador being credited, whether or not their discount is
   *  the one applied. Null when nobody is. */
  attributedTo?: string | null;
}
