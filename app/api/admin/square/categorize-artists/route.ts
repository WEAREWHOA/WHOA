import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { backfillArtistCategories } from "@/lib/squareSync";

// Catch-up run, not part of initial setup — safe to click again any time
// new consignment products get added directly in Square. See
// backfillArtistCategories in lib/squareSync.ts for what it actually does.
export const maxDuration = 300;
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = adminSecretFailure(req);
  if (denied) return adminUnauthorized(denied);

  try {
    const result = await backfillArtistCategories();
    return Response.json(result);
  } catch (err) {
    console.error("categorize-artists failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
