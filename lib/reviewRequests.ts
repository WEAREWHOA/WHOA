import { randomBytes } from "node:crypto";

import { listProducts, productPath } from "@/lib/catalog";
import { sendReviewRequestEmail } from "@/lib/email";
import { getSquare } from "@/lib/square";
import { getSupabase } from "@/lib/supabase";

/**
 * Asking for a review, once, after the thing has arrived.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Square does not know when a parcel is delivered.
 *
 * It knows a fulfilment's state, and COMPLETED means somebody here
 * marked it done: handed it over at the counter, or put it in the post.
 * The carrier never tells Square it arrived. So "the day after it was
 * delivered" is an estimate, and the estimate depends on how the order
 * left the building: a pickup is already in their hands, a shipment is
 * about to spend most of a week in transit.
 *
 * Getting this wrong in the generous direction is cheap (they read it a
 * day late). Getting it wrong the other way means asking somebody what
 * they think of a parcel they have not received, which reads as a
 * company that does not know what it sent.
 * ───────────────────────────────────────────────────────────────────────
 */

/** Days to wait after a fulfilment completes, by how it left. */
const DELAY_DAYS: Record<string, number> = {
  // Already in their hands when it was marked done.
  PICKUP: 1,
  // Transit, then a day to wear it.
  SHIPMENT: 6,
  // Nothing to deliver.
  DIGITAL: 1,
};
const DEFAULT_DELAY_DAYS = 6;

/**
 * Not before this hour, local time. A review request that lands at 3am
 * is at the bottom of the inbox by breakfast.
 */
const SEND_HOUR_PT = 10;

interface SquareFulfilment {
  type?: string;
  state?: string;
  pickupDetails?: { recipient?: { emailAddress?: string; displayName?: string } };
  shipmentDetails?: { recipient?: { emailAddress?: string; displayName?: string } };
  deliveryDetails?: { recipient?: { emailAddress?: string; displayName?: string } };
}

interface SquareOrderish {
  id?: string;
  state?: string;
  fulfillments?: SquareFulfilment[];
  lineItems?: { catalogObjectId?: string; name?: string }[];
}

/** The fulfilment that actually completed, if any has. */
function completedFulfilment(order: SquareOrderish): SquareFulfilment | null {
  return (order.fulfillments ?? []).find((f) => f.state === "COMPLETED") ?? null;
}

function recipientOf(f: SquareFulfilment): { email: string | null; name: string | null } {
  const r = f.pickupDetails?.recipient ?? f.shipmentDetails?.recipient ?? f.deliveryDetails?.recipient;
  return {
    email: r?.emailAddress?.trim().toLowerCase() || null,
    name: r?.displayName?.trim() || null,
  };
}

/**
 * When to send, as an instant.
 *
 * The delay is counted in whole days and then pinned to a civil morning
 * in Pacific time, which is where the shop and most of the customers
 * are. Built by asking the formatter what the offset is at that moment
 * rather than hardcoding one, so this does not drift an hour twice a
 * year.
 */
export function sendTimeFor(fulfillmentType: string | undefined, now = new Date()): Date {
  const days = DELAY_DAYS[fulfillmentType ?? ""] ?? DEFAULT_DELAY_DAYS;
  const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // What hour is it in Pacific at that instant?
  const hourThere = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      hour12: false,
    }).format(target),
  );

  // Nudge forward to the next SEND_HOUR_PT. Never backwards: moving it
  // earlier could put it before the parcel lands.
  const hoursToAdd = (SEND_HOUR_PT - hourThere + 24) % 24;
  return new Date(target.getTime() + hoursToAdd * 60 * 60 * 1000);
}

export interface ReviewRequestItem {
  variationId: string;
  productId: string;
  productName: string;
  productUrl: string;
  imageUrl: string | null;
}

/** Turn the order's line items into things that can be reviewed. */
async function itemsFor(order: SquareOrderish): Promise<ReviewRequestItem[]> {
  const variationIds = (order.lineItems ?? [])
    .map((li) => li.catalogObjectId)
    .filter((id): id is string => Boolean(id));
  if (variationIds.length === 0) return [];

  const catalogue = await listProducts({ onlineOnly: true });
  const byVariation = new Map(
    catalogue.flatMap((product) =>
      product.variations.map((v) => [v.id, product] as const),
    ),
  );

  // One entry per PRODUCT, not per variation. Somebody who bought a
  // small and a medium of the same tee is being asked about the tee.
  const seen = new Set<string>();
  const items: ReviewRequestItem[] = [];
  for (const variationId of variationIds) {
    const product = byVariation.get(variationId);
    if (!product || seen.has(product.id)) continue;
    seen.add(product.id);
    items.push({
      variationId,
      productId: product.id,
      productName: product.name,
      productUrl: `${productPath(product)}`,
      imageUrl: product.imageUrls[0] ?? null,
    });
  }
  return items;
}

export type ScheduleOutcome =
  | { scheduled: true; sendAt: string; items: number }
  | { scheduled: false; reason: string };

/**
 * Schedule the ask, if this order has just become askable.
 *
 * Everything about this is best effort and silent on failure. It runs
 * inside Square's webhook, and a review request that could not be
 * arranged must never be the reason an order fails to sync.
 */
export async function scheduleReviewRequest(orderId: string): Promise<ScheduleOutcome> {
  const supabase = getSupabase();

  // Cheapest check first: Square sends order.updated several times per
  // order, and most of them are not the one that completed it.
  const { data: existing } = await supabase
    .from("review_requests")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) return { scheduled: false, reason: "already asked" };

  const square = getSquare();
  const response = await square.orders.get({ orderId });
  const order = response.order as SquareOrderish | undefined;
  if (!order) return { scheduled: false, reason: "order not found" };

  const fulfilment = completedFulfilment(order);
  if (!fulfilment) return { scheduled: false, reason: "not fulfilled yet" };

  const { email, name } = recipientOf(fulfilment);
  // No address, nobody to ask. Common for a walk-in at the till, which
  // is exactly the sort of sale this should stay quiet about.
  if (!email) return { scheduled: false, reason: "no email on the order" };

  const items = await itemsFor(order);
  if (items.length === 0) return { scheduled: false, reason: "nothing reviewable on the order" };

  const token = randomBytes(24).toString("base64url");
  const sendAt = sendTimeFor(fulfilment.type);

  // Written before the send, so a crash between the two leaves a record
  // that stops a duplicate rather than a silent gap.
  const { error: insertError } = await supabase.from("review_requests").insert({
    order_id: orderId,
    token,
    email,
    customer_name: name,
    fulfillment_type: fulfilment.type ?? "UNKNOWN",
    scheduled_for: sendAt.toISOString(),
    variation_ids: items.map((i) => i.variationId),
    status: "scheduled",
  });

  if (insertError) {
    // 23505 means another delivery of the same webhook won the race.
    if (insertError.code === "23505") return { scheduled: false, reason: "already asked" };
    throw new Error(`Couldn't record a review request: ${insertError.message}`);
  }

  try {
    const emailId = await sendReviewRequestEmail({
      to: email,
      customerName: name,
      items,
      token,
      scheduledAt: sendAt.toISOString(),
    });
    await supabase
      .from("review_requests")
      .update({ resend_email_id: emailId })
      .eq("order_id", orderId);
  } catch (err) {
    console.error(`Couldn't schedule the review email for ${orderId}:`, err);
    await supabase.from("review_requests").update({ status: "failed" }).eq("order_id", orderId);
    return { scheduled: false, reason: "resend refused it" };
  }

  return { scheduled: true, sendAt: sendAt.toISOString(), items: items.length };
}

export interface VerifiedReviewer {
  email: string;
  name: string | null;
  variationIds: string[];
}

/**
 * Who a review token belongs to.
 *
 * The token is the proof. Somebody holding one bought the order it was
 * issued for, so a review arriving with it needs no email typed in and
 * no second lookup against Square. Returns null for anything unknown
 * rather than throwing, because a mistyped link should land on an
 * ordinary review form rather than an error.
 */
export async function reviewerForToken(token: string): Promise<VerifiedReviewer | null> {
  const clean = token.trim();
  if (!clean) return null;

  try {
    const { data, error } = await getSupabase()
      .from("review_requests")
      .select("email, customer_name, variation_ids")
      .eq("token", clean)
      .maybeSingle();

    if (error || !data) return null;
    const row = data as { email: string; customer_name: string | null; variation_ids: string[] | null };
    return {
      email: row.email,
      name: row.customer_name,
      variationIds: row.variation_ids ?? [],
    };
  } catch (err) {
    console.error("Couldn't look up a review token:", err);
    return null;
  }
}
