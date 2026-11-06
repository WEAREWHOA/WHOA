import { buildStockCsv, stockCsvFilename } from "@/lib/stockExport";
import { getSquareLocationId } from "@/lib/square";
import { requirePortalTab } from "@/lib/portalAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The counts as a download.
 *
 * Behind the same gate as the screen itself rather than being a public
 * URL with a guessy name: this is every product we sell and how many of
 * each are left, which is a competitor's homework.
 */
export async function GET() {
  await requirePortalTab("inventory");

  try {
    const csv = await buildStockCsv(getSquareLocationId());
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${stockCsvFilename()}"`,
        // Never cached. A stale stock file is the one thing this is
        // for, and a CDN holding yesterday's copy would hand somebody
        // yesterday's numbers to upload as today's.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Stock export failed:", err);
    return new Response("Couldn't build the export.", { status: 500 });
  }
}
