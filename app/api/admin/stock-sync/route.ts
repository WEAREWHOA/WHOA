import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { drainStockSyncQueue, stuckPushes } from "@/lib/channelSync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send the other shops what has changed.
 *
 * Meant to be called on a schedule, every few minutes. Pull rather than
 * push because the queue collapses repeats: running this often is cheap
 * and running it late costs only freshness, where sending from inside
 * the sale would put a third-party API's latency in the customer's
 * checkout and its outages in our error rate.
 */
export async function POST(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  try {
    const result = await drainStockSyncQueue();
    const stuck = await stuckPushes();
    return Response.json({ ...result, stuck });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stock sync drain failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * The same drain, on GET, because that is the only verb a scheduler
 * sends. A GET that changes things is bad manners, and the alternative
 * is a second route that exists only to be allowed to be called, so it
 * is signposted here instead: ?peek=1 is the read-only one.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`, which is the
 * header this route already wants, so pointing a schedule at it is a
 * matter of setting CRON_SECRET to the same value as
 * SQUARE_ADMIN_SECRET. No schedule is checked in: the queue is inert
 * until a channel is connected, and a cron frequency the account's plan
 * does not allow fails the whole deployment.
 */
export async function GET(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  const peek = new URL(req.url).searchParams.get("peek") === "1";

  try {
    if (peek) return Response.json({ stuck: await stuckPushes() });
    const result = await drainStockSyncQueue();
    return Response.json({ ...result, stuck: await stuckPushes() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stock sync drain failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
