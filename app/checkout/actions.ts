"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getDiscountIneligibleProductIds, getInventoryCounts } from "@/lib/catalog";
import { isPreorderQuantity, PREORDER_LEAD_TIME } from "@/lib/stock";
import { getByCode, getLinkBySlug, recordLinkClick, setSquareCustomerId } from "@/lib/store";
import { captureCheckout, markRecovered } from "@/lib/abandonedCheckouts";
import { recordContactInBackground, TAG } from "@/lib/newsletter";
import { resolveAccount } from "@/lib/accountAuth";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { findOrCreateSquareCustomerId } from "@/lib/squareCustomers";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/attribution";
import { commissionForOrder } from "@/lib/tiers";
import {
  buildOrderPricing,
  discountedMerchandiseCents,
  type CheckoutQuote,
} from "@/lib/checkoutOrder";
import { formatShipTo, isDomestic, normalizeCountry, shippingRateCents } from "@/lib/shipping";
import { PICKUP_LEAD_TIME } from "@/lib/pickup";
import type { CartLine, ShippingAddress } from "@/lib/types";
import type { Country, Money } from "square";

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
 * Whose code is on this sale, if anyone's.
 *
 * Two ways in. Online, the code rides in a cookie, set either by
 * clicking /r/<code> or by typing it at checkout. At the till there is
 * no such thing: the register is one shared browser serving a queue of
 * customers, so a cookie there would attribute every sale of the day to
 * whoever's link the last staff member happened to open. The register
 * passes the code explicitly instead.
 *
 * Undefined means "look in the cookie"; a string or null means "this is
 * the code, and there is no cookie worth reading". The register always
 * passes one or the other, so a walk-in sale can never inherit a
 * referral from the till's own browsing. Without that distinction, one
 * staff member opening an ambassador's /r/ link on the register would
 * quietly take 15% off every sale for the next thirty days and pay the
 * commission to whoever's link it was.
 *
 * An explicitly passed code also does not fall back to the cookie when
 * it resolves to nothing. Staff who typed a code that turns out to be
 * wrong should see no discount, not someone else's.
 *
 * Either way the string is only ever a lookup key: it is resolved to an
 * account through getLinkBySlug here on the server, so nothing the
 * client sends can invent an ambassador or a rate.
 */
async function resolveReferral(promoCode?: string | null) {
  if (promoCode !== undefined) {
    const typed = promoCode?.trim();
    if (!typed) return undefined;
    const link = await getLinkBySlug(typed).catch((err) => {
      console.error("Promo code lookup failed during checkout:", err);
      return undefined;
    });
    if (!link) return undefined;
    return getByCode(link.ambassadorCode).catch((err) => {
      console.error("Referral lookup failed during checkout:", err);
      return undefined;
    });
  }

  const store = await cookies();
  const refCode = store.get(REF_COOKIE)?.value;
  if (!refCode) return undefined;
  // A referral-lookup hiccup should never block a real payment — worst
  // case, this one order just doesn't get the ambassador discount or
  // commission.
  return getByCode(refCode).catch((err) => {
    console.error("Referral lookup failed during checkout:", err);
    return undefined;
  });
}

/**
 * Does this code belong to anyone, and to whom?
 *
 * For the register, so staff get told a code is wrong while the customer
 * is still standing there rather than after the card is charged. Returns
 * the ambassador's name for confirmation out loud ("that's Jane's code")
 * and nothing else about the account.
 */
export async function lookupPromoCodeAction(
  code: string,
): Promise<{ ok: true; code: string; name: string } | { ok: false }> {
  const typed = code.trim();
  if (!typed) return { ok: false };

  try {
    const link = await getLinkBySlug(typed);
    if (!link) return { ok: false };
    const account = await getByCode(link.ambassadorCode);
    if (!account) return { ok: false };
    return { ok: true, code: link.slug, name: account.name };
  } catch (err) {
    console.error("lookupPromoCodeAction failed:", err);
    return { ok: false };
  }
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
export async function quoteCheckoutAction(
  lines: CartLine[],
  /** Destination, so the quote includes the right postage. Defaults to
   *  the US until they pick one. */
  country?: string,
  /** Collecting from the shop means no postage at all, and the quote has
   *  to say so before the card is charged -- otherwise the summary adds
   *  shipping to an order that is never being shipped. */
  method: "ship" | "pickup" = "ship",
  /** The register passes this explicitly, null included; online it is
   *  left off and the cookie is read instead. See resolveReferral. */
  promoCode?: string | null,
): Promise<CheckoutQuote | null> {
  if (lines.length === 0) return null;

  try {
    const ambassador = await resolveReferral(promoCode);

    // Same fail-closed rule as checkoutAction: if eligibility can't be
    // read at all, exclude everything, so the quote never promises a
    // discount the real order won't honour.
    const excludedProductIds = ambassador
      ? await getDiscountIneligibleProductIds(lines.map((l) => l.productId)).catch((err) => {
          console.error("Discount eligibility lookup failed while quoting checkout:", err);
          return new Set(lines.map((l) => l.productId));
        })
      : new Set<string>();

    const shippingCents =
      method === "pickup"
        ? 0
        : shippingRateCents(
            country,
            discountedMerchandiseCents({
              lines,
              ambassadorCode: ambassador?.code,
              excludedProductIds,
            }),
          );

    const response = await getSquare().orders.calculate({
      order: {
        locationId: getSquareLocationId(),
        ...buildOrderPricing({
          lines,
          ambassadorCode: ambassador?.code,
          excludedProductIds,
          shippingCents,
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
      shippingCents,
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
  // at the booth doesn't need a shipment fulfillment. Present, and
  // validated, for an online order that is being shipped.
  shippingAddress?: ShippingAddress;
  /**
   * Collecting from the shop instead of having it posted.
   *
   * A third case, not the absence of the second. An order with no
   * shipping address used to mean exactly one thing -- the till -- and
   * several decisions still read it that way, so pickup says what it is
   * rather than being inferred from what it lacks.
   */
  pickup?: { phone: string };
  /**
   * The ambassador code on this sale. The register always passes this,
   * null when there is no code, so a till sale never inherits a referral
   * cookie. Online orders leave it off and the cookie is read instead;
   * see resolveReferral.
   */
  promoCode?: string | null;
}): Promise<CheckoutResult> {
  if (input.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const shipping = input.shippingAddress;
  if (!input.customerName.trim()) {
    return { ok: false, error: "Name is required." };
  }
  if (shipping) {
    const country = normalizeCountry(shipping.country) || "US";
    // A state is required in the US, where Square validates it. Plenty
    // of countries have no equivalent, and demanding one would make
    // those addresses unenterable.
    const needsState = isDomestic(country);
    if (
      !shipping.line1?.trim() ||
      !shipping.city?.trim() ||
      !shipping.zip?.trim() ||
      (needsState && !shipping.state?.trim())
    ) {
      return { ok: false, error: "A complete shipping address is required." };
    }
    if (!shipping.phone?.trim()) {
      return { ok: false, error: "A phone number is required for shipping." };
    }
  }

  // Same reasoning as the shipping phone: somebody has to be reachable
  // about the order. More so here, where the whole promise is that we
  // will call if there is a problem and they can call to be bumped up
  // the queue.
  if (input.pickup && !input.pickup.phone.trim()) {
    return { ok: false, error: "A phone number is required for pickup." };
  }
  if (!input.customerEmail.trim() && input.pickup) {
    return { ok: false, error: "An email is required for pickup, so we can tell you it's ready." };
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

  const ambassador = await resolveReferral(input.promoCode);

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

  // Live stock, read right before charging, to work out which lines are
  // being made rather than picked.
  //
  // This used to refuse the order outright when a line ran past its
  // count. It no longer does: running out is a pre-order now, not a
  // closed door, and the shop would rather make another than turn the
  // sale away. Square does not block it either -- selling past zero
  // takes the count negative rather than failing -- so the only thing
  // that was stopping the sale was this check.
  //
  // What matters instead is that whoever packs the order finds out. A
  // variation missing from the counts map is untracked, which is
  // unlimited, so nothing about it is ever a pre-order.
  let preorderVariationIds: ReadonlySet<string> = new Set();
  try {
    const counts = await getInventoryCounts(
      input.lines.map((l) => l.variationId),
      locationId,
    );
    preorderVariationIds = new Set(
      input.lines
        .filter((line) => isPreorderQuantity(counts.get(line.variationId), line.quantity))
        .map((line) => line.variationId),
    );
  } catch (err) {
    // Fail towards the shelf. Marking everything a pre-order because
    // Square could not be reached would put a two-to-three-week note on
    // orders that ship today; the shop sees the real counts in Square
    // anyway when it comes to pack them.
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

  // Worked out once, here, because two things need it: the order Square
  // charges, and the commission below, which must not pay an ambassador
  // 10% of the postage.
  const shippingCents = shipping
    ? shippingRateCents(
        shipping.country,
        discountedMerchandiseCents({
          lines: input.lines,
          ambassadorCode: ambassador?.code,
          excludedProductIds,
        }),
      )
    : 0;

  let orderId: string;
  let totalMoney: Money;
  // Square's own tax figure, kept for the commission below. Whatever it
  // charged is the number that matters — tax is configured per item in
  // Square, so nothing here could work it out independently.
  let orderTaxCents = 0;

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
          // Recomputed server-side from the address on the order, by the
          // same function the quote used. Nothing about the postage
          // comes from the browser.
          shippingCents,
          preorderVariationIds,
        }),
        // Three shapes, one field. A posted order gets a SHIPMENT, a
        // collected one gets a PICKUP, and a sale rung up at the till
        // gets neither because the customer already has the goods.
        //
        // ASAP rather than a scheduled slot: no collection time is
        // offered on the checkout, because a time chosen by a stranger
        // at 2am is a promise the shop has to break. The note carries
        // what was actually promised instead, so it is on the order in
        // Square where whoever packs it will see it.
        fulfillments: input.pickup
          ? [
              {
                type: "PICKUP" as const,
                pickupDetails: {
                  scheduleType: "ASAP" as const,
                  // The pre-order wait comes first when there is one: it
                  // is the longer of the two promises and the one that
                  // decides when this can actually be collected.
                  note:
                    preorderVariationIds.size > 0
                      ? `${PREORDER_LEAD_TIME} ${PICKUP_LEAD_TIME}`
                      : PICKUP_LEAD_TIME,
                  recipient: {
                    displayName: input.customerName.trim(),
                    emailAddress: input.customerEmail || undefined,
                    phoneNumber: input.pickup.phone.trim(),
                  },
                },
              },
            ]
          : shipping
          ? [
              {
                type: "SHIPMENT",
                shipmentDetails: {
                  // shippingNote is the only note a SHIPMENT carries, and
                  // only set for a pre-order, so its presence on an order
                  // in Square means something rather than being
                  // boilerplate nobody reads. The per-line notes are what
                  // say which items need making; this says how long the
                  // order as a whole was promised.
                  shippingNote:
                    preorderVariationIds.size > 0 ? PREORDER_LEAD_TIME : undefined,
                  recipient: {
                    displayName: input.customerName.trim(),
                    emailAddress: input.customerEmail || undefined,
                    phoneNumber: shipping.phone.trim(),
                    address: {
                      addressLine1: shipping.line1.trim(),
                      addressLine2: shipping.line2?.trim() || undefined,
                      locality: shipping.city.trim(),
                      // Omitted rather than sent empty where there's no
                      // state to send: Square validates the field's
                      // contents, and "" is contents.
                      administrativeDistrictLevel1: shipping.state.trim() || undefined,
                      postalCode: shipping.zip.trim(),
                      // Square types this as its own Country union. The
                      // value is already normalised to two uppercase
                      // letters, and Square rejects anything that isn't
                      // a real code — so a bad one fails loudly at the
                      // API rather than silently shipping somewhere odd.
                      country: (normalizeCountry(shipping.country) || "US") as Country,
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
    orderTaxCents = Number(orderResponse.order.totalTaxMoney?.amount ?? 0);
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
    // Before the receipt, because the one email nobody should get is a
    // "you left something behind" about an order they just paid for.
    await markRecovered(input.customerEmail);

    // A till sale, identified by having neither a shipping address nor a
    // pickup -- an online order collected from the shop has no address
    // either, and recording that buyer as a walk-in would put them in
    // the wrong segment and skip the consent the checkout form took. The online
    // storefront records its own buyer from the checkout form, where the
    // opt-in box decides whether they are subscribed or merely recorded;
    // the register collects an address for a receipt and asks nothing, so
    // the row says exactly that.
    if (!input.shippingAddress && !input.pickup) {
      const [firstName, ...restOfName] = input.customerName.trim().split(/\s+/);
      recordContactInBackground({
        email: input.customerEmail,
        firstName: firstName && firstName !== "Walk-in" ? firstName : undefined,
        lastName: restOfName.join(" ") || undefined,
        source: "pos",
        tags: [TAG.pos, TAG.customers],
      });
    }

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
      shippingCents: shipping ? shippingCents : undefined,
      shipTo: shipping ? formatShipTo(shipping) : undefined,
      pickup: input.pickup ? true : undefined,
      totalCents: Number(totalMoney.amount),
    }).catch((err) => {
      console.error("Failed to send order confirmation email", err);
    });
  }

  if (ambassador) {
    const { saleAmount, commission } = commissionForOrder({
      totalCents: Number(totalMoney.amount),
      taxCents: orderTaxCents,
      shippingCents,
    });

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

/**
 * Remember a checkout in progress, so it can be followed up if it isn't
 * finished.
 *
 * Called from the form as somebody fills it in, which means repeatedly
 * for one person: each call pushes the reminder later rather than
 * queueing another. Returns nothing a caller can act on, because there
 * is nothing the shopper should ever see about this.
 */
export async function saveCheckoutDraftAction(input: {
  email: string;
  name?: string;
  lines: CartLine[];
}): Promise<void> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  await captureCheckout({
    email: input.email,
    name: input.name ?? null,
    lines: input.lines,
    accountCode: code,
  }).catch((err) => console.error("Couldn't capture a checkout draft:", err));
}
