import { randomUUID } from "node:crypto";
import { getSquare } from "@/lib/square";
import { checkAdminSecret } from "@/lib/squareAdminAuth";

export const runtime = "nodejs";

// One-time setup call: registers this deployment's webhook endpoint with
// Square. Run once after deploying (see README), not on every request.
export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const notificationUrl = `${url.protocol}//${url.host}/api/webhooks/square`;

  try {
    const square = getSquare();
    const response = await square.webhooks.subscriptions.create({
      idempotencyKey: randomUUID(),
      subscription: {
        name: "WHOA sync",
        eventTypes: ["catalog.version.updated", "inventory.count.updated", "order.updated"],
        notificationUrl,
      },
    });

    const subscription = response.subscription;
    if (!subscription) {
      return Response.json({ error: "Square did not return a subscription" }, { status: 502 });
    }

    return Response.json({
      subscriptionId: subscription.id,
      notificationUrl: subscription.notificationUrl,
      eventTypes: subscription.eventTypes,
      signatureKey: subscription.signatureKey,
      nextStep:
        "Copy signatureKey into Vercel as SQUARE_WEBHOOK_SIGNATURE_KEY, then redeploy.",
    });
  } catch (err) {
    console.error("register-webhook failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
