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
 * Postage comes off first. It's money WHOA hands to a carrier, not
 * revenue, so paying 10% of it would mean a $30 order to Australia
 * earning commission on $60. Tax, where Square is configured to charge
 * any, is still included — that predates shipping and changing it would
 * move every ambassador's historical numbers.
 */
export function commissionForOrder(totalCents: number, shippingCents = 0): {
  saleAmount: number;
  commission: number;
} {
  const saleAmount = Math.max(0, Math.round(totalCents) - Math.max(0, Math.round(shippingCents))) / 100;
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
