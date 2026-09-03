import { headers } from "next/headers";

export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Static counterpart to getSiteOrigin() above, for the places metadata
// needs a base URL outside a request context (root layout's metadataBase,
// sitemap.ts, robots.ts) where headers() isn't available/appropriate. The
// real production domain isn't known to this codebase yet — set
// NEXT_PUBLIC_SITE_URL in the deployment environment once it is.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
