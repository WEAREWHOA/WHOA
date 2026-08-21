import { checkAdminSecret } from "@/lib/squareAdminAuth";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

// One-time diagnostic: hits Supabase through the exact same client the
// rest of the app uses (including the request timeout) and reports how
// long it took and what, if anything, went wrong — so a connectivity
// problem can be confirmed in one page load instead of hunting through
// Vercel's log UI. Not meant to stay in the app long-term.
function checkSecret(req: Request): boolean {
  const secret = process.env.SQUARE_ADMIN_SECRET;
  if (!secret) return false;
  const url = new URL(req.url);
  return checkAdminSecret(req) || url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!checkSecret(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const envCheck = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  if (!envCheck.hasSupabaseUrl || !envCheck.hasServiceRoleKey) {
    return Response.json({ ok: false, envCheck, error: "Missing Supabase env vars" }, { status: 500 });
  }

  const startedAt = Date.now();
  try {
    const { error, count } = await getSupabase()
      .from("ambassadors")
      .select("code", { count: "exact", head: true });

    const elapsedMs = Date.now() - startedAt;

    if (error) {
      return Response.json({ ok: false, envCheck, elapsedMs, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true, envCheck, elapsedMs, accountCount: count });
  } catch (err) {
    const elapsedMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, envCheck, elapsedMs, error: message }, { status: 500 });
  }
}
