"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getInventoryCounts } from "@/lib/catalog";
import { getByCode, getByEmail, getCredentialsByEmail, createAmbassador, setSquareCustomerId } from "@/lib/store";
import { createSession, destroySession, getSessionAmbassadorCode, hashPassword, verifyPassword } from "@/lib/auth";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
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

// Checkout's own account bar (see CheckoutForm) reuses the same
// email+password accounts as /login — this just returns who, if anyone,
// the current session belongs to, so the form can prefill name/email and
// skip the password field for a returning, already-signed-in customer.
export async function getCheckoutAccountAction(): Promise<{ name: string; email: string } | null> {
  const code = await getSessionAmbassadorCode();
  if (!code) return null;
  const account = await getByCode(code);
  return account ? { name: account.name, email: account.email } : null;
}

// Deliberately doesn't redirect (unlike lib/actions.ts's logoutAction) —
// this is called from the checkout page itself and must leave the buyer
// right where they were, cart and page intact.
export async function checkoutSignOutAction(): Promise<void> {
  await destroySession();
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
  let accountCreated = false;
  let signedIn = false;
  const alreadySignedIn = Boolean(await getSessionAmbassadorCode());
  if (!alreadySignedIn && input.password) {
    const email = input.customerEmail.trim();
    const existingAccount = email ? await getByEmail(email) : undefined;

    if (existingAccount) {
      const credentials = await getCredentialsByEmail(email);
      const valid = credentials ? await verifyPassword(input.password, credentials.passwordHash) : false;
      if (!valid || !credentials) {
        return {
          ok: false,
          error: "An account already exists for this email — enter the correct password to sign in, or check out as a guest.",
        };
      }
      await createSession(credentials.code);
      signedIn = true;
    } else if (input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    } else {
      const passwordHash = await hashPassword(input.password);
      const created = await createAmbassador({ name: input.customerName.trim(), email, passwordHash });
      await createSession(created.code);
      accountCreated = true;
    }
  }

  // The account this order belongs to, if any — resolved fresh so it
  // covers both a pre-existing session and one just created above.
  const accountCode = await getSessionAmbassadorCode();

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
    accountCreated: accountCreated || undefined,
    signedIn: signedIn || undefined,
  };
}
