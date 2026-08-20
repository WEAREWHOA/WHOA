import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

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
  client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return client;
}
