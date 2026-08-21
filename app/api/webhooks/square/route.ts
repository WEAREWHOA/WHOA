import { WebhooksHelper } from "square";
import { syncFullCatalog, syncInventoryForVariations, syncOrder } from "@/lib/squareSync";

// Full catalog/order resyncs can take longer than the platform default —
// give the handler headroom instead of racing a short timeout.
export const maxDuration = 60;
export const runtime = "nodejs";

interface SquareWebhookEnvelope {
  type?: string;
  event_id?: string;
  data?: {
    id?: string;
    type?: string;
    object?: Record<string, unknown>;
  };
}

export async function POST(req: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey) {
    console.error("square webhook: missing SQUARE_WEBHOOK_SIGNATURE_KEY");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
  const rawBody = await req.text();

  if (!signatureHeader) {
    return new Response("Missing signature", { status: 401 });
  }

  const valid = await WebhooksHelper.verifySignature({
    requestBody: rawBody,
    signatureHeader,
    signatureKey,
    notificationUrl: req.url,
  });

  if (!valid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: SquareWebhookEnvelope;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    switch (event.type) {
      case "catalog.version.updated": {
        // Full resync is simpler and more robust than diffing the payload,
        // and cheap enough at this catalog size.
        const { variationIds } = await syncFullCatalog();
        await syncInventoryForVariations(variationIds);
        break;
      }

      case "inventory.count.updated": {
        const counts = event.data?.object?.inventory_counts as
          | { catalog_object_id?: string }[]
          | undefined;
        const variationIds = (counts ?? [])
          .map((c) => c.catalog_object_id)
          .filter((id): id is string => Boolean(id));
        await syncInventoryForVariations(variationIds);
        break;
      }

      case "order.updated": {
        const orderId = event.data?.id;
        if (orderId) await syncOrder(orderId);
        break;
      }

      default:
        // Unhandled event type — ack without doing anything.
        break;
    }
  } catch (err) {
    console.error(`square webhook: failed to process ${event.type}:`, err);
    // Non-2xx so Square retries; every sync above is upsert-based, so a
    // retry is harmless even if part of the previous attempt succeeded.
    return new Response("Processing failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
