import { getSupabase } from "@/lib/supabase";
import { getByEmail } from "@/lib/store";

export const runtime = "nodejs";

// One-time diagnostic: exercises the exact same queries the signup path
// uses (not just a basic connectivity check — the first version of this
// route used a plain head-count query, which didn't catch anything because
// getByEmail/getByCode use a more complex select with nested embeds:
// AMBASSADOR_PUBLIC_SELECT includes orders(*) and links(*)). Reports how
// long each step took and what, if anything, went wrong — so a
// signup-path bug can be confirmed in one page load instead of more log
// hunting. Deliberately unauthenticated (SQUARE_ADMIN_SECRET isn't set in
// this deployment) — the response never contains anything sensitive, and
// the write-path check inserts then immediately deletes a clearly-fake
// test row. Delete this route once the signup issue is resolved.
async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; result?: T; error?: string }> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return { ms: Date.now() - startedAt, result };
  } catch (err) {
    return { ms: Date.now() - startedAt, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const envCheck = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  if (!envCheck.hasSupabaseUrl || !envCheck.hasServiceRoleKey) {
    return Response.json({ ok: false, envCheck, error: "Missing Supabase env vars" }, { status: 500 });
  }

  // Step 1: the exact read query registerAction runs first (nested embed
  // select, same as the one that caused the original /portal/[code] 404).
  const readCheck = await timed(() => getByEmail("diag-test-nobody@wearewhoa.invalid"));

  // Step 2: a real insert + immediate delete against the ambassadors
  // table, exercising the write path createAmbassador uses. Uses an
  // obviously-fake code/email so it can't collide with a real account.
  const testCode = `DIAG-${Date.now()}`;
  const writeCheck = await timed(async () => {
    const supabase = getSupabase();
    const { error: insertError } = await supabase.from("ambassadors").insert({
      code: testCode,
      name: "Diagnostic Test",
      email: `${testCode.toLowerCase()}@wearewhoa.invalid`,
      password_hash: "diag-test-not-a-real-hash",
      perm_ambassador: false,
      perm_vendor: false,
      perm_music: false,
      perm_ssbd: false,
    });
    if (insertError) throw new Error(`insert failed: ${insertError.message}`);

    const { error: deleteError } = await supabase.from("ambassadors").delete().eq("code", testCode);
    if (deleteError) throw new Error(`cleanup delete failed (row "${testCode}" may still exist): ${deleteError.message}`);

    return "insert + delete round-trip ok";
  });

  return Response.json({
    envCheck,
    readCheck: { ms: readCheck.ms, ok: !readCheck.error, error: readCheck.error },
    writeCheck: { ms: writeCheck.ms, ok: !writeCheck.error, error: writeCheck.error },
  });
}
