import { recordChannelSale } from "@/lib/channelSync";
import { getSquareLocationId } from "@/lib/square";
import { verifyTiktokWebhook } from "@/lib/tiktokShop";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * TikTok telling us it sold something.
 *
 * The inbound half of the sync, and the half that makes the outbound
 * half safe: a push that is not preceded by this just restates a number
 * that is already wrong.
 *
 * Always answers 200 once the signature checks out, even when the work
 * fails. A non-2xx has TikTok redeliver, and redelivering is not a fix
 * for an unmapped sku or a database that is down; it only turns one
 * problem into a retry storm. The failure is logged and the order is
 * left unclaimed so a later delivery can still pick it up.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  if (!verifyTiktokWebhook(rawBody, req.headers.get("authorization"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let envelope: { type?: number; data?: { order_id?: string; order_status?: string } };
  try {
    envelope = JSON.parse(rawBody) as typeof envelope;
  } catch {
    return new Response("Unreadable body", { status: 400 });
  }

  const orderId = envelope.data?.order_id;
  const status = envelope.data?.order_status;

  // Stock comes off when the order is paid and waiting to be sent, not
  // when it is delivered. Anything else is a status we do not act on:
  // taking stock twice for one order is the thing the claim exists to
  // prevent, and giving it back on a cancellation is a separate piece
  // of work that should be built deliberately rather than guessed at.
  if (!orderId || status !== "AWAITING_SHIPMENT") {
    return Response.json({ ok: true, ignored: status ?? "no status" });
  }

  try {
    const result = await recordChannelSale("tiktok", orderId, getSquareLocationId());
    if (result.short.length > 0) {
      console.error(`TikTok order ${orderId} could not be fully taken:`, result.short);
    }
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error(`TikTok webhook failed for order ${orderId}:`, err);
    return Response.json({ ok: false }, { status: 200 });
  }
}
