import { getSupabase } from "./supabase";
import { adjustStock } from "./stockStore";
import { fetchTiktokOrder, pushTiktokStock, tiktokConfigured } from "./tiktokShop";

/**
 * Telling the other shops what we have.
 *
 * The queue is filled by a database trigger (0053), in the same
 * transaction as the stock change itself, so there is no ordering in
 * which a count moves without the push being queued. This file is only
 * the half that drains it: read what is pending, hand each row to the
 * channel that wants it, write down what happened.
 *
 * It holds the current number rather than a list of changes. If a count
 * moved five times before this ran, the fifth number is the only one
 * worth sending, and the first four would arrive out of order anyway.
 */

export interface PendingPush {
  id: number;
  channel: string;
  variationId: string;
  locationId: string;
  quantity: number;
  tracked: boolean;
  externalId: string;
  attempts: number;
}

/**
 * How many failures before we stop trying.
 *
 * A row that has failed this often is failing for a reason that
 * retrying will not fix: a sku that no longer exists, a token that was
 * revoked. It stays in the queue unsent so somebody can see it rather
 * than being retried forever behind a silently growing backlog.
 */
const MAX_ATTEMPTS = 6;

/** Who can be told. Adding a channel is adding a line here. */
const PUSHERS: Record<string, { configured: () => boolean; push: (row: PendingPush) => Promise<void> }> = {
  tiktok: { configured: tiktokConfigured, push: pushTiktokStock },
};

/**
 * Pending rows, joined to the listing that says what the thing is
 * called on the other end. A row whose listing has been deleted is not
 * returned and never will be; it is left for the sweep below.
 */
export async function pendingPushes(limit = 100): Promise<PendingPush[]> {
  const { data, error } = await getSupabase()
    .from("stock_sync_queue")
    .select("id, channel, variation_id, location_id, quantity, tracked, attempts")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("queued_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Couldn't read the sync queue: ${error.message}`);

  const rows = (data ?? []) as {
    id: number;
    channel: string;
    variation_id: string;
    location_id: string;
    quantity: number;
    tracked: boolean;
    attempts: number;
  }[];

  if (rows.length === 0) return [];

  const { data: listings, error: listingError } = await getSupabase()
    .from("channel_listings")
    .select("channel, variation_id, external_id")
    .in("variation_id", [...new Set(rows.map((r) => r.variation_id))]);

  if (listingError) throw new Error(`Couldn't read channel listings: ${listingError.message}`);

  const byKey = new Map(
    ((listings ?? []) as { channel: string; variation_id: string; external_id: string }[]).map(
      (l) => [`${l.channel}\u0000${l.variation_id}`, l.external_id],
    ),
  );

  return rows.flatMap((row) => {
    const externalId = byKey.get(`${row.channel}\u0000${row.variation_id}`);
    if (!externalId) return [];
    return [{
      id: row.id,
      channel: row.channel,
      variationId: row.variation_id,
      locationId: row.location_id,
      quantity: row.quantity,
      tracked: row.tracked,
      externalId,
      attempts: row.attempts,
    }];
  });
}

async function markSent(id: number): Promise<void> {
  await getSupabase()
    .from("stock_sync_queue")
    .update({ sent_at: new Date().toISOString(), last_error: null })
    .eq("id", id);
}

async function markFailed(row: PendingPush, message: string): Promise<void> {
  await getSupabase()
    .from("stock_sync_queue")
    .update({ attempts: row.attempts + 1, last_error: message.slice(0, 500) })
    .eq("id", row.id);
}

export interface DrainResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Send what is waiting.
 *
 * One row at a time on purpose: these are rate-limited third-party APIs
 * and a burst of parallel writes to the same shop is how you get
 * throttled into a backlog. The queue collapses repeats, so the steady
 * state is a handful of rows, not a flood.
 *
 * A failure is recorded and moved past rather than thrown. One dead sku
 * must not stop the other ninety-nine from being told the truth.
 */
export async function drainStockSyncQueue(limit = 100): Promise<DrainResult> {
  const rows = await pendingPushes(limit);
  const result: DrainResult = { sent: 0, failed: 0, skipped: 0 };

  for (const row of rows) {
    const pusher = PUSHERS[row.channel];
    // Not configured is not a failure: it is a channel nobody has
    // connected yet. Counting it as one would burn the attempts and
    // bury real rows behind a wall of retries.
    if (!pusher || !pusher.configured()) {
      result.skipped += 1;
      continue;
    }

    try {
      await pusher.push(row);
      await markSent(row.id);
      result.sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Couldn't push ${row.variationId} to ${row.channel}:`, message);
      await markFailed(row, message);
      result.failed += 1;
    }
  }

  return result;
}

/** What is stuck, for the people who have to go and look. */
export async function stuckPushes(): Promise<
  { channel: string; variationId: string; attempts: number; lastError: string | null }[]
> {
  const { data, error } = await getSupabase()
    .from("stock_sync_queue")
    .select("channel, variation_id, attempts, last_error")
    .is("sent_at", null)
    .gte("attempts", MAX_ATTEMPTS)
    .order("queued_at", { ascending: true })
    .limit(50);

  if (error) throw new Error(`Couldn't read stuck pushes: ${error.message}`);

  return ((data ?? []) as {
    channel: string;
    variation_id: string;
    attempts: number;
    last_error: string | null;
  }[]).map((row) => ({
    channel: row.channel,
    variationId: row.variation_id,
    attempts: row.attempts,
    lastError: row.last_error,
  }));
}

/**
 * A sale somewhere else, taken off our shelf.
 *
 * The other half of the loop. Without it the sync only talks: TikTok
 * takes an order, our count never moves, and the next push puts
 * TikTok's number back up to the one we still wrongly hold. Two shops
 * then sell the same thing and the customer finds out first.
 *
 * The claim happens before anything is fetched or moved. Order
 * webhooks are delivered at least once and the same order arrives
 * again on a retry, so without it a redelivery takes the stock down a
 * second time and a popular item walks to zero by itself.
 *
 * The push that follows is not a loop. TikTok already took its own
 * count down when the order was placed, so the number we send back is
 * the one it already holds, and the two settle rather than chase each
 * other.
 */
export async function recordChannelSale(
  channel: string,
  orderId: string,
  locationId: string,
): Promise<{ claimed: boolean; lines: number; short: string[] }> {
  const supabase = getSupabase();

  const { data: claimed, error: claimError } = await supabase.rpc("claim_channel_order", {
    p_channel: channel,
    p_external_order_id: orderId,
  });
  if (claimError) throw new Error(`Couldn't claim ${channel} order ${orderId}: ${claimError.message}`);
  if (!claimed) return { claimed: false, lines: 0, short: [] };

  if (channel !== "tiktok") throw new Error(`No order reader for channel ${channel}`);
  const items = await fetchTiktokOrder(orderId);
  if (items.length === 0) return { claimed: true, lines: 0, short: [] };

  const { data: listings, error: listingError } = await supabase
    .from("channel_listings")
    .select("variation_id, external_id")
    .eq("channel", channel)
    .in("external_id", items.map((i) => i.skuId));
  if (listingError) throw new Error(`Couldn't read ${channel} listings: ${listingError.message}`);

  const toVariation = new Map(
    ((listings ?? []) as { variation_id: string; external_id: string }[]).map((l) => [
      l.external_id,
      l.variation_id,
    ]),
  );

  // Taken line by line rather than all or nothing. The sale has already
  // happened on TikTok; refusing it here would not un-sell it, it would
  // only leave our count wrong in the direction that oversells. A line
  // we cannot satisfy is recorded as short so somebody can look.
  const short: string[] = [];
  let lines = 0;

  for (const item of items) {
    const variationId = toVariation.get(item.skuId);
    if (!variationId) {
      // A sku nobody mapped. Nothing to take it off, and silently
      // doing nothing is how this would be discovered much later.
      short.push(`unmapped sku ${item.skuId}`);
      continue;
    }

    const result = await adjustStock({
      variationId,
      locationId,
      delta: -item.quantity,
      reason: "tiktok",
      reference: orderId,
    });
    lines += 1;
    if (!result.applied) short.push(`${variationId} oversold on ${channel}`);
  }

  return { claimed: true, lines, short };
}
