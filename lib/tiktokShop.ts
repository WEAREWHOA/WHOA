import { createHmac, timingSafeEqual } from "crypto";
import type { PendingPush } from "./channelSync";

/**
 * Telling TikTok what we have.
 *
 * Deliberately the thinnest thing that could work: one signed request,
 * one call. Everything that decides WHEN to tell TikTok lives in the
 * queue (0053) and in channelSync; this only knows how to say it.
 *
 * A warning that belongs in the code rather than in somebody's memory:
 * the signing recipe and the inventory field names below are from
 * TikTok's published docs and have never been run against the live API,
 * because the shop app does not exist yet. They are a starting point to
 * be confirmed with one real call, not something to trust silently. The
 * signing is one exported function for exactly that reason: if it is
 * wrong, it is wrong in one place.
 */

const BASE = process.env.TIKTOK_API_BASE ?? "https://open-api.tiktokglobalshop.com";

/**
 * Whether we can talk to TikTok at all.
 *
 * Every piece or nothing. A half-configured channel that tries anyway
 * would burn the queue's retry budget producing 401s.
 */
export function tiktokConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_APP_KEY &&
      process.env.TIKTOK_APP_SECRET &&
      process.env.TIKTOK_ACCESS_TOKEN &&
      process.env.TIKTOK_SHOP_CIPHER &&
      process.env.TIKTOK_WAREHOUSE_ID,
  );
}

/**
 * The signature TikTok wants.
 *
 * HMAC-SHA256 keyed by the app secret, over the secret, the path, the
 * query parameters sorted by key and concatenated without separators
 * (with sign and access_token left out), the body, and the secret
 * again. Exported so it can be checked against a known-good example
 * without going near the network.
 */
export function signRequest(
  path: string,
  params: Record<string, string>,
  body: string,
  secret: string,
): string {
  const canonical = Object.keys(params)
    .filter((key) => key !== "sign" && key !== "access_token")
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");

  return createHmac("sha256", secret)
    .update(`${secret}${path}${canonical}${body}${secret}`)
    .digest("hex");
}

async function call(path: string, body: unknown, method: "POST" | "GET" = "POST"): Promise<unknown> {
  const appKey = process.env.TIKTOK_APP_KEY!;
  const secret = process.env.TIKTOK_APP_SECRET!;
  const token = process.env.TIKTOK_ACCESS_TOKEN!;

  const params: Record<string, string> = {
    app_key: appKey,
    shop_cipher: process.env.TIKTOK_SHOP_CIPHER!,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  // A GET signs over an empty body and sends none; its arguments are
  // query parameters, so they go through the signature with the rest.
  const payload = method === "POST" ? JSON.stringify(body) : "";
  if (method === "GET" && body && typeof body === "object") {
    for (const [key, value] of Object.entries(body as Record<string, string>)) {
      params[key] = String(value);
    }
  }
  params.sign = signRequest(path, params, payload, secret);

  const response = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": token,
    },
    ...(method === "POST" ? { body: payload } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`TikTok ${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  // A 200 with a non-zero code in the body is still a failure, and this
  // is the API where that happens: an expired token comes back as 200.
  // Treating it as success is how a shop quietly stops being updated.
  let parsed: { code?: number; message?: string; data?: unknown };
  try {
    parsed = JSON.parse(text) as { code?: number; message?: string; data?: unknown };
  } catch {
    throw new Error(`TikTok ${path} returned unreadable JSON: ${text.slice(0, 200)}`);
  }
  if (parsed.code && parsed.code !== 0) {
    throw new Error(`TikTok ${path} failed (${parsed.code}): ${parsed.message ?? "no message"}`);
  }
  return parsed.data;
}

/**
 * Set one sku's quantity.
 *
 * Untracked means unlimited here, which TikTok has no concept of, so it
 * gets a large number instead. The alternative is sending 0 and having
 * TikTok mark a made-to-order piece sold out, which is the exact bug
 * tracked=false exists to prevent on our own shop.
 */
export async function pushTiktokStock(row: PendingPush): Promise<void> {
  const quantity = row.tracked ? Math.max(row.quantity - stockBuffer(), 0) : 9999;

  await call("/product/202309/inventory/update", {
    skus: [
      {
        id: row.externalId,
        inventory: [
          {
            warehouse_id: process.env.TIKTOK_WAREHOUSE_ID,
            quantity,
          },
        ],
      },
    ],
  });
}

/**
 * How many we keep back from TikTok.
 *
 * The queue drains on a schedule, so there is always a window in which
 * TikTok and our own shop both believe the last one is available and
 * both can sell it. No amount of pushing faster closes that; the only
 * thing that does is not offering the last one to both.
 *
 * TikTok charges for being wrong about this in a way our own shop does
 * not: an out-of-stock cancellation counts against a seller-fault rate
 * with a cap on it, and the penalty for crossing it is fewer orders.
 * One held back is cheap insurance against that. Zero by default, so
 * nothing changes until somebody decides it should.
 */
function stockBuffer(): number {
  const raw = Number(process.env.TIKTOK_STOCK_BUFFER ?? "0");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/**
 * Whether a webhook delivery really came from TikTok.
 *
 * A different scheme from the one that signs our outbound calls, which
 * is a thing worth knowing before debugging it: HMAC-SHA256 over the
 * app key followed by the raw body, keyed by the app secret, sent in
 * the Authorization header with no word in front of it.
 *
 * The raw body, not the parsed one. Re-serialising JSON changes
 * whitespace and key order and the digest stops matching, which looks
 * exactly like an attack and is not one.
 */
export function verifyTiktokWebhook(rawBody: string, header: string | null): boolean {
  const appKey = process.env.TIKTOK_APP_KEY;
  const secret = process.env.TIKTOK_APP_SECRET;
  if (!appKey || !secret || !header) return false;

  const expected = createHmac("sha256", secret).update(`${appKey}${rawBody}`).digest("hex");
  const sent = Buffer.from(header.trim().replace(/^Bearer\s+/i, ""));
  const mine = Buffer.from(expected);
  if (sent.length !== mine.length) return false;
  return timingSafeEqual(sent, mine);
}

export interface TiktokOrderLine {
  skuId: string;
  quantity: number;
}

/**
 * What was actually in an order.
 *
 * The webhook says an order changed and gives its id, not its contents,
 * so the lines have to be fetched. One call per order, which is why the
 * claim in channel_orders happens first: a redelivered webhook should
 * not spend a request finding out it has nothing to do.
 */
export async function fetchTiktokOrder(orderId: string): Promise<TiktokOrderLine[]> {
  const data = (await call("/order/202309/orders", { ids: orderId }, "GET")) as {
    orders?: { line_items?: { sku_id?: string }[] }[];
  } | null;

  const items = data?.orders?.[0]?.line_items ?? [];

  // TikTok sends one line item per unit rather than a line with a
  // quantity, so the units are counted here. Trusting a quantity field
  // that is always 1 would take one off for an order of six.
  const counted = new Map<string, number>();
  for (const item of items) {
    if (!item.sku_id) continue;
    counted.set(item.sku_id, (counted.get(item.sku_id) ?? 0) + 1);
  }

  return [...counted.entries()].map(([skuId, quantity]) => ({ skuId, quantity }));
}
