import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

const REQUEST_TIMEOUT_MS = 8_000;

// A request that hangs (bad network path, stuck connection, etc.) would
// otherwise sit until Vercel's hard 60s function timeout kills it with no
// detail at all — every caller's try/catch just never fires. Aborting at
// 8s instead turns that into a normal, catchable error with a clear
// message, so it shows up as e.g. "Failed to look up account by email:
// This operation was aborted" in the logs instead of a bare timeout.
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

// Lazily created so that importing this module (which happens at build time
// for every route, even dynamic ones) never requires the env vars to be
// set — only calling getSupabase() at request time does.
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  // Service-role client for trusted server-side code only (Server
  // Components, Server Actions, Route Handlers). Never import this from
  // client components — the service role key bypasses row-level security.
  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { fetch: fetchWithTimeout },
  });
  return client;
}
