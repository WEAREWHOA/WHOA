"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getInventoryCounts } from "@/lib/catalog";
import { getByCode } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { REF_COOKIE } from "@/lib/attribution";
import type { CartLine, ShippingAddress } from "@/lib/types";
import type { Money } from "square";

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export async function checkoutAction(input: {
  token: string;
  lines: CartLine[];
  customerName: string;
  customerEmail: string;
  // Omitted for the POS register's in-person sales — a customer standing
  // at the booth doesn't need a shipment fulfillment. Always present, and
  // validated, for the online storefront's checkout.
  shippingAddress?: ShippingAddress;
}): Promise<CheckoutResult> {
  if (input.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const shipping = input.shippingAddress;
  if (!input.customerName.trim()) {
    return { ok: false, error: "Name is required." };
  }
  if (shipping) {
    if (!shipping.line1?.trim() || !shipping.city?.trim() || !shipping.state?.trim() || !shipping.zip?.trim()) {
      return { ok: false, error: "A complete shipping address is required." };
    }
    if (!shipping.phone?.trim()) {
      return { ok: false, error: "A phone number is required for shipping." };
    }
  }

  const store = await cookies();
  const refCode = store.get(REF_COOKIE)?.value;
  // A referral-lookup hiccup should never block a real payment — worst
  // case, this one order just doesn't get the ambassador discount/commission.
  const ambassador = refCode
    ? await getByCode(refCode).catch((err) => {
        console.error("Referral lookup failed during checkout:", err);
        return undefined;
      })
    : undefined;

  const locationId = getSquareLocationId();
  const square = getSquare();

  // Re-check live stock right before charging anything — a cart can go
  // stale between "add to cart" and "hit pay" (someone else buys the last
  // one, or the customer just typed a number bigger than what's left,
  // since the cart page's quantity input has no cap of its own). A
  // variation missing from the counts map isn't tracked in Square at all,
  // which means unlimited — only a variation Square actually tracks, at a
  // count lower than what's in the cart, blocks the order.
  try {
    const counts = await getInventoryCounts(
      input.lines.map((l) => l.variationId),
      locationId,
    );
    for (const line of input.lines) {
      const available = counts.get(line.variationId);
      if (available !== undefined && line.quantity > available) {
        return {
          ok: false,
          error:
            available === 0
              ? `${line.productName} (${line.variationName}) just sold out.`
              : `Only ${available} of ${line.productName} (${line.variationName}) left — update your cart.`,
        };
      }
    }
  } catch (err) {
    // A stock-check hiccup shouldn't block a sale outright — Square's own
    // order creation still enforces its own inventory rules server-side.
    console.error("Stock check failed during checkout:", err);
  }

  let orderId: string;
  let totalMoney: Money;

  try {
    const orderResponse = await square.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        lineItems: input.lines.map((line) => ({
          catalogObjectId: line.variationId,
          quantity: String(line.quantity),
        })),
        discounts: ambassador
          ? [
              {
                name: `WHOA Ambassador (${ambassador.code})`,
                type: "FIXED_PERCENTAGE",
                percentage: "15",
                scope: "ORDER",
              },
            ]
          : undefined,
        fulfillments: shipping
          ? [
              {
                type: "SHIPMENT",
                shipmentDetails: {
                  recipient: {
                    displayName: input.customerName.trim(),
                    emailAddress: input.customerEmail || undefined,
                    phoneNumber: shipping.phone.trim(),
                    address: {
                      addressLine1: shipping.line1.trim(),
                      addressLine2: shipping.line2?.trim() || undefined,
                      locality: shipping.city.trim(),
                      administrativeDistrictLevel1: shipping.state.trim(),
                      postalCode: shipping.zip.trim(),
                      country: "US",
                    },
                  },
                },
              },
            ]
          : undefined,
      },
    });

    if (!orderResponse.order?.id || orderResponse.order.totalMoney?.amount == null) {
      return { ok: false, error: "Couldn't create the order. Please try again." };
    }

    orderId = orderResponse.order.id;
    totalMoney = orderResponse.order.totalMoney;
  } catch (err) {
    console.error("Square order creation failed", err);
    return { ok: false, error: "Couldn't create the order. Please try again." };
  }

  try {
    const paymentResponse = await square.payments.create({
      sourceId: input.token,
      idempotencyKey: randomUUID(),
      amountMoney: totalMoney,
      locationId,
      orderId,
      buyerEmailAddress: input.customerEmail || undefined,
    });

    if (!paymentResponse.payment) {
      return { ok: false, error: "Payment did not complete. Please try again." };
    }
  } catch (err) {
    console.error("Square payment failed", err);
    return { ok: false, error: "Payment did not go through. Please check your card details." };
  }

  if (ambassador) {
    const saleAmount = Number(totalMoney.amount) / 100;
    const commission = Math.round(saleAmount * 0.1 * 100) / 100;

    const { error } = await getSupabase().from("orders").insert({
      id: `sq_${orderId}`,
      ambassador_code: ambassador.code,
      customer: input.customerName.trim() || "Online order",
      sale_amount: saleAmount,
      commission,
    });

    if (error) {
      // The payment already succeeded — don't fail the checkout over an
      // attribution bookkeeping error, just log it for follow-up.
      console.error("Failed to record ambassador commission", error);
    }
  }

  return { ok: true, orderId };
}
