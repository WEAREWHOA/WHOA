import { buildRestockColumn, NoSkuColumnError } from "@/lib/restockFill";
import { getSquareLocationId } from "@/lib/square";
import { requirePortalTab } from "@/lib/portalAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Enough for a big catalogue, small enough that nobody can post a film. */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Their spreadsheet in, a quantity column out.
 *
 * A route rather than a server action because the answer is a file
 * download, and an action that redirects cannot hand one back.
 */
export async function POST(req: Request) {
  await requirePortalTab("inventory");

  const form = await req.formData();
  const file = form.get("sheet");

  if (!(file instanceof File) || file.size === 0) {
    return new Response("Choose a CSV file first.", { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return new Response("That file is too big. Export just the sheet with the SKUs on it.", {
      status: 400,
    });
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return new Response("Couldn't read that file. Save it as CSV and try again.", { status: 400 });
  }

  // A .xlsx read as text is a zip, so it starts with PK. Caught by hand
  // because the alternative is a wall of binary rubbish parsed as rows
  // and an unhelpful "no SKU column" at the end of it.
  if (text.startsWith("PK")) {
    return new Response(
      "That looks like an Excel file. Open it and use File, Save As, CSV, then upload that.",
      { status: 400 },
    );
  }

  try {
    const result = await buildRestockColumn(text, getSquareLocationId());
    return new Response(result.csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="quantities-${result.matched}-matched.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof NoSkuColumnError) {
      const seen = err.headers.filter(Boolean).join(", ");
      return new Response(
        "Couldn't find a SKU column in that file. The columns it has are: " +
          (seen || "none that we could read") +
          ". Tell us which one holds your SKUs and we'll teach it that name.",
        { status: 400 },
      );
    }
    console.error("Restock fill failed:", err);
    return new Response("Something went wrong reading that file.", { status: 500 });
  }
}
