import { listProducts, productPath } from "@/lib/catalog";
import { SHIPPING_ZONES, shippingRateCents } from "@/lib/shipping";
import { SITE_URL } from "@/lib/siteUrl";
import type { Product, ProductVariation } from "@/lib/types";

/**
 * The product feed Google Merchant Center reads.
 *
 * Structured data on a product page tells Google about a page. A feed
 * tells Google about the products themselves, and it's what the free
 * Shopping listings, the Shopping tab and most AI shopping surfaces
 * actually consume. The two say the same things on purpose: a feed that
 * disagrees with the page it points at gets the item disapproved.
 *
 * RSS 2.0 with Google's namespace, which is the format Merchant Center
 * accepts by URL fetch. Every field Google marks required for apparel is
 * here, because a missing one is a disapproved item rather than a
 * slightly worse listing:
 *
 *   id, title, description, link, image_link, availability, price,
 *   condition, brand, and for apparel also gtin OR mpn.
 *
 * One entry per variation, not per product. A shopper searching for a
 * size buys that size, and Merchant Center groups variants of one item
 * through item_group_id.
 */

export const FEED_TITLE = "WHOA";
export const BRAND = "WHOA";

/** Escapes text for XML. Square descriptions are free text written by
 *  people, so they contain ampersands and angle brackets. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are not legal in XML 1.0 at all, and one pasted
    // into a Square description would make the whole feed unparseable
    // rather than just that item.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

/** Google caps title at 150 characters and description at 5000. */
function clamp(value: string, max: number): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * What a variation is called on its own.
 *
 * "Ohm Crop Top" and "Ohm Crop Top (M)" are different products to
 * Google. Square's default variation name is the literal string
 * "Default" or "Regular" for an item with only one, which should not
 * end up in a shopper's search results.
 */
function variationTitle(product: Product, variation: ProductVariation): string {
  const name = variation.name?.trim() ?? "";
  const generic = !name || /^(default|regular)$/i.test(name);
  return clamp(generic ? product.name : `${product.name} (${name})`, 150);
}

/**
 * Shipping, as Google wants it: a rate per country, matching what
 * checkout will actually charge.
 *
 * Quoted at this item's own price, because the rates are tiered by order
 * value. A shopper buying one $45 tee pays the tier that price falls in,
 * which is the honest number to advertise for that item. Their basket
 * may well qualify for a cheaper tier, and being charged less at
 * checkout than the listing promised is the safe direction to be wrong.
 */
function shippingNodes(priceCents: number): string {
  const nodes: string[] = [];
  for (const zone of SHIPPING_ZONES) {
    // Rest-of-world has no country list, and Google needs a country on
    // every shipping node, so it can't be advertised here. Those orders
    // still price correctly at checkout.
    for (const country of zone.countries) {
      const rate = shippingRateCents(country, priceCents) / 100;
      nodes.push(
        `<g:shipping><g:country>${country}</g:country><g:service>Standard</g:service>` +
          `<g:price>${rate.toFixed(2)} USD</g:price></g:shipping>`,
      );
    }
  }
  return nodes.join("");
}

function itemXml(product: Product, variation: ProductVariation): string {
  const link = `${SITE_URL}${productPath(product)}`;
  const price = (variation.priceCents / 100).toFixed(2);
  // A variation Square doesn't track is unlimited, not sold out.
  const inStock = variation.inStock == null || variation.inStock > 0;

  const description = clamp(
    product.description ||
      `${product.name} from WHOA. Hand-finished in San Diego, so no two are exactly alike.`,
    5000,
  );

  const parts = [
    `<g:id>${xml(variation.id)}</g:id>`,
    `<g:item_group_id>${xml(product.id)}</g:item_group_id>`,
    `<title>${xml(variationTitle(product, variation))}</title>`,
    `<description>${xml(description)}</description>`,
    `<link>${xml(link)}</link>`,
    `<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
    `<g:price>${price} USD</g:price>`,
    `<g:condition>new</g:condition>`,
    `<g:brand>${xml(BRAND)}</g:brand>`,
    // WHOA makes its own pieces and they carry no barcode, so Google's
    // "gtin or mpn" requirement is met with the identifier that really
    // does identify one: Square's variation id, which is what the
    // warehouse and the till both use.
    `<g:mpn>${xml(variation.id)}</g:mpn>`,
    `<g:identifier_exists>no</g:identifier_exists>`,
  ];

  if (product.imageUrls[0]) {
    parts.push(`<g:image_link>${xml(product.imageUrls[0])}</g:image_link>`);
    // Up to 10 extra photos, which is Google's cap.
    for (const extra of product.imageUrls.slice(1, 11)) {
      parts.push(`<g:additional_image_link>${xml(extra)}</g:additional_image_link>`);
    }
  }

  parts.push(shippingNodes(variation.priceCents));

  return `<item>${parts.join("")}</item>`;
}

/**
 * Only items a shopper can actually buy.
 *
 * An item with no photo is rejected by Merchant Center, and one with no
 * price can't be listed at all. Filtering them here means the feed is
 * clean rather than mostly-clean with a list of errors in the dashboard.
 */
function sellable(product: Product): boolean {
  return product.imageUrls.length > 0 && product.variations.some((v) => v.priceCents > 0);
}

export async function buildProductFeed(): Promise<string> {
  const products = await listProducts({ onlineOnly: true });

  const items = products
    .filter(sellable)
    .flatMap((product) =>
      product.variations.filter((v) => v.priceCents > 0).map((v) => itemXml(product, v)),
    )
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>One-of-a-kind hand-finished apparel from WHOA.</description>
    ${items}
  </channel>
</rss>`;
}
