import type { TierId } from "./types";

export interface TierDef {
  id: TierId;
  label: string;
  minOrders: number;
  color: string;
  perks: string[];
}

export const COMMISSION_RATE = 0.1;
export const CUSTOMER_DISCOUNT = 0.15;

/**
 * What an ambassador earns on one order, and what gets recorded as the
 * sale it was earned on — both in dollars, which is how the orders table
 * stores them.
 *
 * The rule is: **post-promo, pre-tax, excluding shipping.** What's left
 * is the goods at the price the customer actually paid for them.
 *
 * - Discounts and promo codes come off first, because they already have
 *   — `totalCents` is Square's own net total, so a 15% ambassador
 *   discount has been applied before this ever sees it.
 * - Tax comes off, because it's collected on WHOA's behalf and remitted
 *   to the state. None of it is WHOA's to share.
 * - Postage comes off, because it's handed to a carrier. Otherwise a $30
 *   order to Australia would earn commission on $60.
 */
export function commissionForOrder({
  totalCents,
  taxCents = 0,
  shippingCents = 0,
}: {
  /** Square's own total for the order: net of discounts, with tax and
   *  postage in it. */
  totalCents: number;
  /** Square's `totalTaxMoney` — whatever it actually charged, rather
   *  than anything worked out here. */
  taxCents?: number;
  shippingCents?: number;
}): { saleAmount: number; commission: number } {
  const cents = (n: number) => Math.max(0, Math.round(n));
  const saleAmount = Math.max(0, cents(totalCents) - cents(taxCents) - cents(shippingCents)) / 100;
  return {
    saleAmount,
    commission: Math.round(saleAmount * COMMISSION_RATE * 100) / 100,
  };
}

export const TIERS: TierDef[] = [
  {
    id: "rookie",
    label: "Rookie",
    minOrders: 0,
    color: "var(--tier-rookie)",
    perks: [
      "Your own code + special link",
      "10% commission on every sale",
      "Real-time click and order tracking",
    ],
  },
  {
    id: "rising",
    label: "Rising",
    minOrders: 5,
    color: "var(--tier-rising)",
    perks: [
      "Everything in Rookie",
      "Early access to new drops before they go public",
      "Ambassador-only caption and asset packs",
    ],
  },
  {
    id: "icon",
    label: "Icon",
    minOrders: 20,
    color: "var(--tier-icon)",
    perks: [
      "Everything in Rising",
      "Direct line to the WHOA team",
      "Invites to WHOA events and shoots",
    ],
  },
];

export function getTier(orderCount: number): TierDef {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (orderCount >= tier.minOrders) current = tier;
  }
  return current;
}

export function getTierProgress(orderCount: number) {
  const tierIndex = TIERS.findIndex((t) => t.id === getTier(orderCount).id);
  const current = TIERS[tierIndex];
  const next = TIERS[tierIndex + 1] ?? null;

  if (!next) {
    return { current, next: null, percent: 100, ordersToNext: 0 };
  }

  const span = next.minOrders - current.minOrders;
  const into = orderCount - current.minOrders;
  const percent = Math.min(100, Math.round((into / span) * 100));

  return {
    current,
    next,
    percent,
    ordersToNext: Math.max(0, next.minOrders - orderCount),
  };
}
