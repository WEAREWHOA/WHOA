import { listProducts, productPath } from "@/lib/catalog";
import { SITE_URL } from "@/lib/siteUrl";

/**
 * llms.txt: a plain-text map of the site for AI assistants.
 *
 * The convention is a short, unambiguous summary plus links, on the
 * theory that a model answering "where can I buy hand-painted festival
 * wear" does better with a clean index than with a rendered React page.
 * It's a courtesy file, not a standard anyone is obliged to read, so
 * nothing depends on it and it costs one route.
 *
 * Deliberately points at the product feed as well as the pages: an
 * assistant that can parse a Merchant Center feed gets prices, stock
 * and postage in a form it can actually use.
 */
export const revalidate = 3600;

export async function GET() {
  // A catalogue listing is nice to have here, not essential, so a Square
  // hiccup drops the product section rather than the whole file.
  const products = await listProducts({ onlineOnly: true }).catch(() => []);

  const productLines = products
    .slice(0, 200)
    .map((p) => {
      const price = Math.min(...p.variations.map((v) => v.priceCents).filter((c) => c > 0));
      const priceLabel = Number.isFinite(price) ? ` ($${(price / 100).toFixed(2)})` : "";
      return `- [${p.name}](${SITE_URL}${productPath(p)})${priceLabel}`;
    })
    .join("\n");

  const body = `# WHOA

> One-of-a-kind hand-bleached and hand-painted apparel from San Diego, California.
> Every piece is finished by hand, so no two are alike. WHOA also runs the WHOADEGA
> shop, live events, an Art Collective of independent artists, and a brand
> ambassador program.

## Shopping

- [Shop all products](${SITE_URL}/shop)
- [Product feed (Google Merchant Center RSS format, with prices, stock and shipping)](${SITE_URL}/product-feed.xml)
- [Upcycled Collection](${SITE_URL}/shop?q=upcycled)
- [Shipping rates, domestic and international](${SITE_URL}/shipping-policy)
- [Return policy](${SITE_URL}/return-policy)
- [Contact and custom orders](${SITE_URL}/contact)

## About

- [About WHOA](${SITE_URL}/about)
- [Our story](${SITE_URL}/about/story)
- [Our history, 2015 to today](${SITE_URL}/about/history)
- [Partnerships, donations and how we try to keep this eco-friendly](${SITE_URL}/partnerships)
- [Blog: how the pieces get made, the artists, and what happens at a pop-up](${SITE_URL}/blog)
- [The WHOA Podcast](${SITE_URL}/podcast)
- [FAQ](${SITE_URL}/faq)

## Take part

- [Events](${SITE_URL}/events)
- [Become a brand ambassador](${SITE_URL}/ambassadors)
- [Apply](${SITE_URL}/join)

## Products
${productLines || "- See the shop, linked above."}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
