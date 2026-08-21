import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";

// One-time diagnostic: hits Supabase through the exact same client the
// rest of the app uses (including the request timeout) and reports how
// long it took and what, if anything, went wrong — so a connectivity
// problem can be confirmed in one page load instead of hunting through
// Vercel's log UI. Deliberately unauthenticated (SQUARE_ADMIN_SECRET
// isn't set in this deployment) — the response never contains anything
// sensitive, just booleans/timing/a row count. Delete this route once the
// connectivity question is resolved.
export async function GET() {
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
