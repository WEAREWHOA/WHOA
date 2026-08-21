import { checkAdminSecret } from "@/lib/squareAdminAuth";
import { backfillOrders, syncFullCatalog, syncInventoryForVariations } from "@/lib/squareSync";

// Historical backfill can take a while on a large catalog/order history —
// give it the most headroom Vercel allows rather than racing the default.
export const maxDuration = 300;
export const runtime = "nodejs";

// One-time setup call: pulls the full existing catalog, inventory, and
// order history into Supabase. Safe to re-run — every sync step is
// upsert-based, so calling this again just refreshes everything.
export async function POST(req: Request) {
  if (!checkAdminSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { productIds, variationIds } = await syncFullCatalog();
  await syncInventoryForVariations(variationIds);
  const orderCount = await backfillOrders();

  return Response.json({
    products: productIds.length,
    variations: variationIds.length,
    orders: orderCount,
  });
}
