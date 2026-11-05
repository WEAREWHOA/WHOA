import { createHmac } from "crypto";
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

async function call(path: string, body: unknown): Promise<void> {
  const appKey = process.env.TIKTOK_APP_KEY!;
  const secret = process.env.TIKTOK_APP_SECRET!;
  const token = process.env.TIKTOK_ACCESS_TOKEN!;

  const params: Record<string, string> = {
    app_key: appKey,
    shop_cipher: process.env.TIKTOK_SHOP_CIPHER!,
    timestamp: String(Math.floor(Date.now() / 1000)),
  };

  const payload = JSON.stringify(body);
  params.sign = signRequest(path, params, payload, secret);

  const response = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-tts-access-token": token,
    },
    body: payload,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`TikTok ${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  // A 200 with a non-zero code in the body is still a failure, and this
  // is the API where that happens: an expired token comes back as 200.
  // Treating it as success is how a shop quietly stops being updated.
  let parsed: { code?: number; message?: string };
  try {
    parsed = JSON.parse(text) as { code?: number; message?: string };
  } catch {
    throw new Error(`TikTok ${path} returned unreadable JSON: ${text.slice(0, 200)}`);
  }
  if (parsed.code && parsed.code !== 0) {
    throw new Error(`TikTok ${path} failed (${parsed.code}): ${parsed.message ?? "no message"}`);
  }
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
  const quantity = row.tracked ? Math.max(row.quantity, 0) : 9999;

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
