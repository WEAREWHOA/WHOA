import { buildProductFeed } from "@/lib/productFeed";

/**
 * The catalogue, for Meta Commerce Manager.
 *
 * Paste this URL into Commerce Manager as a scheduled feed and Instagram
 * Shopping and the Facebook Shop both read from it. Same products, same
 * prices and same stock as the website, because it is built from the
 * same catalogue call the shop pages use rather than a second copy that
 * can drift.
 *
 * Separate from the Google feed because Meta's availability values have
 * spaces where Google's have underscores, and because Meta takes a stock
 * count that Google has no field for. Two routes over one builder, so
 * the products can never disagree between them.
 *
 * Deliberately NOT Square's own Facebook sync. Two sources feeding one
 * catalogue produce duplicate items, and the duplicates fight each other
 * for which one a post links to. If Square's Meta connection is on, turn
 * it off before scheduling this.
 */
export const revalidate = 3600;

export async function GET() {
  try {
    const xml = await buildProductFeed("meta");
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    // A 503 rather than an empty feed, for the same reason as the Google
    // one: an empty feed reads as "every product was delisted" and would
    // empty the shop on Instagram.
    console.error("Couldn't build the Meta product feed:", err);
    return new Response("Product feed temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Retry-After": "900" },
    });
  }
}
