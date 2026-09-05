"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getArtistSalesProductIds, getInventoryCounts } from "@/lib/catalog";
import { getByCode, setSquareCustomerId } from "@/lib/store";
import { resolveAccount } from "@/lib/accountAuth";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";
import { REF_COOKIE } from "@/lib/attribution";
import type { CartLine, ShippingAddress } from "@/lib/types";
import type { Money } from "square";

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  // Lets the confirmation UI say "you're signed in" without a second
  // round trip — omitted (not just false) when the buyer was already
  // signed in beforehand, since there's nothing new to announce.
  accountCreated?: boolean;
  signedIn?: boolean;
}

export async function checkoutAction(input: {
  token: string;
  lines: CartLine[];
  customerName: string;
  customerEmail: string;
  // Only ever sent from the online storefront's own account bar, and only
  // when the buyer isn't already signed in — never sent from the POS
  // register. Blank/omitted means "just check out as a guest."
  password?: string;
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

  // Sign the buyer in or create their account before touching stock or
  // money — a wrong password or a too-short new one should stop the order
  // cold, the same way a missing shipping field does above, rather than
  // surfacing after a card's already been charged.
  const account = await resolveAccount({
    name: input.customerName,
    email: input.customerEmail,
    password: input.password,
  });
  if (account.error) {
    return { ok: false, error: account.error };
  }
  const accountCode = account.code;

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

  // Square's own docs warn that skipping `customer_id` on an order/payment
  // "might result in the creation of new instant profiles" instead of
  // linking to the real Customer record — which is exactly what silently
  // broke purchase history before this: every order landed as a
  // disconnected instant profile the portal's Customer tab could never
  // find. Best-effort — a Square hiccup here shouldn't block a real sale,
  // it just means this one order won't show up in purchase history.
  const buyerEmail = input.customerEmail.trim();
  const squareCustomerId = buyerEmail
    ? await findOrCreateSquareCustomerId(buyerEmail, input.customerName).catch((err) => {
        console.error("Failed to find/create Square customer during checkout:", err);
        return undefined;
      })
    : undefined;

  if (accountCode && squareCustomerId) {
    await setSquareCustomerId(accountCode, squareCustomerId).catch((err) => {
      console.error("Failed to cache Square customer id on account:", err);
    });
  }

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

  // Artist Sales items (everyone's cut except WHOA's own WHOAdega/WHOA
  // products) never get a promo-code/ambassador discount — checked
  // server-side against Square's real category data, never trusting
  // whatever the client's cart line objects happen to carry. Only
  // resolved when there's actually a discount that would otherwise apply.
  const AMBASSADOR_DISCOUNT_UID = "ambassador-discount";
  const excludedProductIds = ambassador
    ? await getArtistSalesProductIds(input.lines.map((l) => l.productId)).catch((err) => {
        console.error("Artist Sales category lookup failed during checkout:", err);
        // Fail closed: if we can't tell what's excluded, exclude
        // everything rather than risk discounting artist sales.
        return new Set(input.lines.map((l) => l.productId));
      })
    : new Set<string>();

  let orderId: string;
  let totalMoney: Money;

  try {
    const orderResponse = await square.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        customerId: squareCustomerId,
        lineItems: input.lines.map((line) => ({
          catalogObjectId: line.variationId,
          quantity: String(line.quantity),
          appliedDiscounts:
            ambassador && !excludedProductIds.has(line.productId)
              ? [{ discountUid: AMBASSADOR_DISCOUNT_UID }]
              : undefined,
        })),
        discounts: ambassador
          ? [
              {
                uid: AMBASSADOR_DISCOUNT_UID,
                name: `WHOA Ambassador (${ambassador.code})`,
                type: "FIXED_PERCENTAGE",
                percentage: "15",
                scope: "LINE_ITEM",
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
      customerId: squareCustomerId,
      buyerEmailAddress: input.customerEmail || undefined,
    });

    if (!paymentResponse.payment) {
      return { ok: false, error: "Payment did not complete. Please try again." };
    }
  } catch (err) {
    console.error("Square payment failed", err);
    return { ok: false, error: "Payment did not go through. Please check your card details." };
  }

  if (input.customerEmail) {
    // The payment already succeeded — a confirmation-email hiccup shouldn't
    // fail the checkout, just get logged for follow-up.
    await sendOrderConfirmationEmail({
      to: input.customerEmail,
      customerName: input.customerName.trim(),
      orderId,
      lines: input.lines.map((line) => ({
        name: `${line.productName} (${line.variationName})`,
        quantity: line.quantity,
        totalCents: line.priceCents * line.quantity,
      })),
      totalCents: Number(totalMoney.amount),
    }).catch((err) => {
      console.error("Failed to send order confirmation email", err);
    });
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

  return {
    ok: true,
    orderId,
    accountCreated: account.accountCreated || undefined,
    signedIn: account.signedIn || undefined,
  };
}
