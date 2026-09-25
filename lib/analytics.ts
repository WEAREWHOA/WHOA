import { sendGAEvent } from "@next/third-parties/google";
import type { CartLine } from "@/lib/types";

// Google Analytics 4. Unset in dev and preview deployments, so nothing is
// loaded or sent from them — only the environment that sets the ID reports.
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// sendGAEvent writes to window.dataLayer, which only exists once the
// <GoogleAnalytics> tag in the root layout has mounted — and that tag only
// mounts when the measurement ID is set. Without the ID, tracking is a no-op.
function track(event: string, params: Record<string, unknown>) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  try {
    sendGAEvent("event", event, params);
  } catch {
    // analytics must never break the store
  }
}

// GA4's recommended ecommerce item shape, so these show up in the
// Monetization reports without any custom-dimension setup.
function toItem(line: Pick<CartLine, "productId" | "productName" | "variationName" | "priceCents">, quantity: number) {
  return {
    item_id: line.productId,
    item_name: line.productName,
    item_variant: line.variationName,
    price: line.priceCents / 100,
    quantity,
  };
}

export function trackAddToCart(line: Omit<CartLine, "quantity">, quantity: number) {
  track("add_to_cart", {
    currency: "USD",
    value: (line.priceCents * quantity) / 100,
    items: [toItem(line, quantity)],
  });
}

export function trackBeginCheckout(lines: CartLine[], valueCents: number) {
  track("begin_checkout", {
    currency: "USD",
    value: valueCents / 100,
    items: lines.map((l) => toItem(l, l.quantity)),
  });
}

export function trackPurchase(orderId: string, lines: CartLine[], valueCents: number) {
  track("purchase", {
    transaction_id: orderId,
    currency: "USD",
    value: valueCents / 100,
    items: lines.map((l) => toItem(l, l.quantity)),
  });
}
