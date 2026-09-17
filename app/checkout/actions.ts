"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getDiscountIneligibleProductIds, getInventoryCounts } from "@/lib/catalog";
import { getByCode, getLinkBySlug, recordLinkClick, setSquareCustomerId } from "@/lib/store";
import { resolveAccount } from "@/lib/accountAuth";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/attribution";
import { buildOrderPricing, type CheckoutQuote } from "@/lib/checkoutOrder";
import type { CartLine, ShippingAddress } from "@/lib/types";
import type { Money } from "square";

// A promo code is nothing new — every ambassador's auto-created "Default"
// link (see ensureDefaultLink, lib/store.ts) already uses their own code
// as its slug, so typing that code here is the exact same attribution
// path as clicking /r/<code>: same cookie, same 15%/10% discount and
// commission logic in checkoutAction below, and it counts as a real click
// on their Default link too. No separate code-generation or validation
// system needed.
export async function applyPromoCodeAction(formData: FormData) {
  const code = String(formData.get("promoCode") || "").trim();
  if (!code) {
    redirect("/checkout?promoError=1");
  }

  let link: Awaited<ReturnType<typeof getLinkBySlug>>;
  try {
    link = await getLinkBySlug(code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("Promo code lookup failed during checkout:", err);
    redirect("/checkout?promoError=1");
  }

  if (!link) {
    redirect("/checkout?promoError=1");
  }

  await recordLinkClick(link.slug).catch((err) => {
    console.error("Failed to record promo code click during checkout:", err);
  });

  const store = await cookies();
  store.set(REF_COOKIE, link.ambassadorCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
    path: "/",
  });

  redirect("/checkout?promoApplied=1");
}

/**
 * What this cart really costs, priced by Square rather than guessed in the
 * browser.
 *
 * The checkout used to show a total it worked out itself: cart subtotal
 * minus a flat 15%. Square prices the actual order from the catalog, so
 * the two could disagree — an Art Collective item doesn't take the
 * ambassador discount, and any tax configured on the items is added by
 * Square. The customer would then be charged something other than the
 * number they agreed to, and the amount shown in the Apple Pay sheet would
 * be wrong too.
 *
 * `orders.calculate` runs Square's pricing engine without creating an
 * order, so the quote comes from exactly the same rules that will charge
 * the card a moment later.
 *
 * Returns null if Square can't be reached; the caller falls back to the
 * cart's own arithmetic so a pricing hiccup can't block checking out.
 *
 * NOTE ON TAX: this collects the tax configured on the items in Square —
 * it does not work out what tax is owed. Square applies catalog/location
 * taxes; it does not do destination-based US sales tax by ship-to address.
 */
export async function quoteCheckoutAction(lines: CartLine[]): Promise<CheckoutQuote | null> {
  if (lines.length === 0) return null;

  try {
    const store = await cookies();
    const refCode = store.get(REF_COOKIE)?.value;
    const ambassador = refCode
      ? await getByCode(refCode).catch((err) => {
          console.error("Referral lookup failed while quoting checkout:", err);
          return undefined;
        })
      : undefined;

    // Same fail-closed rule as checkoutAction: if eligibility can't be
    // read at all, exclude everything, so the quote never promises a
    // discount the real order won't honour.
    const excludedProductIds = ambassador
      ? await getDiscountIneligibleProductIds(lines.map((l) => l.productId)).catch((err) => {
          console.error("Discount eligibility lookup failed while quoting checkout:", err);
          return new Set(lines.map((l) => l.productId));
        })
      : new Set<string>();

    const response = await getSquare().orders.calculate({
      order: {
        locationId: getSquareLocationId(),
        ...buildOrderPricing({
          lines,
          ambassadorCode: ambassador?.code,
          excludedProductIds,
        }),
      },
    });

    const order = response.order;
    if (order?.totalMoney?.amount == null) return null;

    const cents = (money?: Money) => (money?.amount == null ? 0 : Number(money.amount));

    return {
      // The line rows the customer is already looking at, summed — not
      // derived from Square, so it always matches what's listed above it.
      subtotalCents: lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
      discountCents: cents(order.totalDiscountMoney),
      taxCents: cents(order.totalTaxMoney),
      totalCents: Number(order.totalMoney.amount),
    };
  } catch (err) {
    console.error("Failed to quote checkout with Square:", err);
    return null;
  }
}

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

  // Ambassador and promo discounts apply to WHOA's own goods only. Which
  // those are is read from each item's Square description at charge time
  // (see lib/discountEligibility.ts), never trusting whatever the client's
  // cart line objects happen to carry. Only resolved when there's actually
  // a discount that would otherwise apply.
  const excludedProductIds = ambassador
    ? await getDiscountIneligibleProductIds(input.lines.map((l) => l.productId)).catch((err) => {
        console.error("Discount eligibility lookup failed during checkout:", err);
        // Fail closed: if eligibility can't be read, exclude everything
        // rather than risk discounting something that isn't ours.
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
        ...buildOrderPricing({
          lines: input.lines,
          ambassadorCode: ambassador?.code,
          excludedProductIds,
        }),
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
