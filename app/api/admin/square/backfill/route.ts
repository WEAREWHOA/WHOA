import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { backfillOrders, syncFullCatalog, syncInventoryFromMirror } from "@/lib/squareSync";

// Historical backfill can take a while on a large catalog/order history —
// give it the most headroom Vercel allows rather than racing the default.
export const maxDuration = 300;
export const runtime = "nodejs";

/**
 * One-time setup call: pulls the full existing catalog, inventory, and
 * order history into Supabase. Safe to re-run — every sync step is
 * upsert-based, so calling this again just refreshes everything.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Why this returns before it has finished.
 *
 * It used to do all three steps in one request and answer when they were
 * done, which on a real catalogue meant a 504: the gateway gives up
 * before the work does, and a 504 tells you nothing about how far it
 * got. maxDuration is a ceiling the platform may lower, not a promise.
 *
 * So the request now stops at a deadline of its own, well inside any
 * plan's limit, and hands back where it had reached. The caller comes
 * straight back with that token and carries on. The work is the same; it
 * just arrives in pieces that each fit, and a slow step can no longer
 * throw away the steps before it.
 *
 * The deadline is checked between pages, never inside one, so every page
 * is either fully written or not begun.
 * ───────────────────────────────────────────────────────────────────────
 */
const BUDGET_MS = 40_000;

type Step = "catalog" | "inventory" | "orders";

interface Resume {
  step: Step;
  /** Orders only. */
  cursor?: string;
  /** Inventory only. */
  offset?: number;
}

export async function POST(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  const deadline = Date.now() + BUDGET_MS;

  let resume: Resume = { step: "catalog" };
  try {
    const body = (await req.json().catch(() => null)) as { resume?: Resume } | null;
    if (body?.resume?.step) resume = body.resume;
  } catch {
    // No body is the normal first call.
  }

  const progress: Record<string, number> = {};

  try {
    if (resume.step === "catalog") {
      // Not resumable: it pages Square's catalogue and writes a row per
      // page already, and splitting it would mean carrying a Square
      // cursor whose lifetime we do not control.
      const { productIds, variationIds } = await syncFullCatalog();
      progress.products = productIds.length;
      progress.variations = variationIds.length;
      resume = { step: "inventory", offset: 0 };
    }

    if (resume.step === "inventory") {
      const { processed, nextOffset } = await syncInventoryFromMirror({
        offset: resume.offset ?? 0,
        deadline,
      });
      progress.inventory = processed;
      if (nextOffset != null) {
        return Response.json({ done: false, resume: { step: "inventory", offset: nextOffset }, progress });
      }
      resume = { step: "orders" };
    }

    const { count, cursor } = await backfillOrders({ cursor: resume.cursor, deadline });
    progress.orders = count;
    if (cursor) {
      return Response.json({ done: false, resume: { step: "orders", cursor }, progress });
    }

    return Response.json({ done: true, progress });
  } catch (err) {
    console.error("backfill failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    // The step is in the body so a failure says which part gave up, and
    // so a retry can start from there rather than from the beginning.
    return Response.json({ error: message, step: resume.step, progress }, { status: 500 });
  }
}
