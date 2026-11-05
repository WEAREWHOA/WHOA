import { getSupabase } from "./supabase";
import { pushTiktokStock, tiktokConfigured } from "./tiktokShop";

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
