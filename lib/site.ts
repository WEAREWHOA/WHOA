import { headers } from "next/headers";

export const STOREFRONT_URL = process.env.STOREFRONT_URL ?? "https://www.wearewhoa.art";

export async function getSiteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
