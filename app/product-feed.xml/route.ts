import { buildProductFeed } from "@/lib/productFeed";

/**
 * The feed URL to paste into Google Merchant Center, and the one most
 * other shopping surfaces will accept too.
 *
 * Revalidated hourly rather than on every request: Merchant Center
 * fetches this on its own schedule, and a crawler hitting it shouldn't
 * page through the whole Square catalogue each time.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const xml = await buildProductFeed();
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    // A Square hiccup must not hand Merchant Center an empty feed: an
    // empty feed reads as "every product was delisted" and takes the
    // whole account's listings down. A 503 reads as "try again", which
    // is what we mean.
    console.error("Couldn't build the product feed:", err);
    return new Response("Product feed temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "900" },
    });
  }
}
