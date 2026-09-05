import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Re-exported for every existing call site that imports it from here —
// the constant itself now lives in lib/siteUrl.ts (no next/headers
// dependency), so a module that needs SITE_URL without also needing
// getSiteOrigin can import it from there directly instead of pulling in
// next/headers, which breaks if that module is ever reached from a client
// bundle. See lib/siteUrl.ts.
export { SITE_URL } from "./siteUrl";
