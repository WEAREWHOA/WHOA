import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { listProducts, productPath, resolveProduct } from "@/lib/catalog";
import AddToCart from "@/components/shop/AddToCart";
import ProductGallery from "@/components/shop/ProductGallery";
import { formatCents } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import { BRAND } from "@/lib/productFeed";
import { RETURN_WINDOW_DAYS } from "@/lib/returns";
import { SHIPPING_ZONES, shippingRateCents } from "@/lib/shipping";
import type { Product } from "@/lib/types";

export const revalidate = 60;

/**
 * Prerender every product at build time.
 *
 * Without this the route is fully dynamic: the declared revalidate never
 * applied, so every visit to every product page paged through Square's
 * whole catalog to resolve one slug and then fetched the item. With it,
 * a product page is static HTML that refreshes in the background.
 *
 * Failing soft on purpose. dynamicParams stays on its default of true,
 * so an empty list here just means pages render on demand exactly as
 * they did before — a Square hiccup during a build shouldn't be able to
 * fail the deploy.
 */
export async function generateStaticParams() {
  try {
    const products = await listProducts({ onlineOnly: true });
    return products.map((product) => ({ itemId: product.slug }));
  } catch (err) {
    console.error("Couldn't prerender product pages; they'll render on demand:", err);
    return [];
  }
}

/**
 * schema.org Product markup.
 *
 * This is what makes a product eligible for Google's free Shopping
 * listings and what AI shopping surfaces read when they summarise an
 * item. The bar is higher than "some markup": Google treats brand,
 * a product identifier, condition, price, availability, shipping and a
 * return policy as required, and an offer missing them is ineligible
 * rather than merely plainer.
 *
 * One Offer per variation rather than a single AggregateOffer, because
 * a shopper buys a size. AggregateOffer says "something here costs
 * between $45 and $85", which cannot be listed as a product.
 *
 * Everything here is generated from the same sources the page and the
 * checkout use, so it can't advertise a price, a stock state or a
 * postage rate the customer won't actually get. JSON.stringify's output
 * is escaped (a </script> in a Square-sourced name could otherwise
 * terminate the tag early) before being injected as raw HTML.
 */
function buildProductJsonLd(product: Product, canonicalPath: string): string {
  const url = `${SITE_URL}${canonicalPath}`;

  // Google wants a date the price is good until. A year out is honest
  // for a made-to-order brand and stops the offer going stale, which
  // reads as "no longer for sale".
  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const returnPolicy = {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: RETURN_WINDOW_DAYS,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    merchantReturnLink: `${SITE_URL}/return-policy`,
  };

  // Postage quoted at this item's own price, since the rates are tiered
  // by order value. A bigger basket only ever pays less.
  const shippingDetails = (priceCents: number) =>
    SHIPPING_ZONES.flatMap((zone) =>
      zone.countries.map((country) => ({
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: (shippingRateCents(country, priceCents) / 100).toFixed(2),
          currency: "USD",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: country,
        },
      })),
    );

  const variations = product.variations.filter((v) => v.priceCents > 0);
  const offers = (variations.length > 0 ? variations : product.variations).map((variation) => ({
    "@type": "Offer",
    url,
    // Square's variation id is the identifier the till and the feed both
    // use, so the three agree on what a given size is.
    sku: variation.id,
    priceCurrency: "USD",
    price: (variation.priceCents / 100).toFixed(2),
    priceValidUntil,
    itemCondition: "https://schema.org/NewCondition",
    // Null means Square doesn't track this variation, which is
    // unlimited rather than sold out.
    availability:
      variation.inStock == null || variation.inStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    seller: { "@type": "Organization", name: BRAND },
    hasMerchantReturnPolicy: returnPolicy,
    shippingDetails: shippingDetails(variation.priceCents),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.imageUrls.length > 0 ? product.imageUrls : undefined,
    url,
    sku: product.id,
    mpn: product.id,
    brand: { "@type": "Brand", name: BRAND },
    offers: offers.length === 1 ? offers[0] : offers,
  };

  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export async function generateMetadata(props: PageProps<"/shop/[itemId]">): Promise<Metadata> {
  const { itemId } = await props.params;
  const resolved = await resolveProduct(itemId).catch(() => undefined);
  if (!resolved) return {};

  const { product } = resolved;
  return {
    title: product.name,
    description: product.description || `Shop ${product.name} on WHOA.`,
    openGraph: product.imageUrl ? { images: [product.imageUrl] } : undefined,
    // Points at the slug even when reached by an old id URL, so the two
    // never compete as duplicates in the index.
    alternates: { canonical: `/shop/${resolved.kind === "legacy-id" ? resolved.slug : itemId}` },
  };
}

export default async function ProductPage(props: PageProps<"/shop/[itemId]">) {
  const { itemId } = await props.params;

  let resolved: Awaited<ReturnType<typeof resolveProduct>>;
  try {
    resolved = await resolveProduct(itemId);
  } catch (err) {
    console.error(`Failed to load product ${itemId} for /shop/[itemId]:`, err);
    return (
      <section className="mx-auto w-full max-w-2xl px-6 py-16">
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          The shop is temporarily unavailable. Check back soon.
        </p>
      </section>
    );
  }

  if (!resolved) notFound();

  // Reached by a Square id — the old URL shape, still linked from Google
  // and from anything printed before slugs existed. Send it on to the
  // readable one so the ranking follows and there's only ever one URL per
  // product in the index.
  if (resolved.kind === "legacy-id") permanentRedirect(`/shop/${resolved.slug}`);

  const { product } = resolved;
  const canonicalPath = productPath(product);

  const prices = product.variations.map((v) => v.priceCents);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 lg:grid-cols-2">
      {/* Product structured data — the difference between a plain blue link
          and a Google result showing price/availability directly. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildProductJsonLd(product, canonicalPath) }}
      />

      <ProductGallery name={product.name} imageUrls={product.imageUrls} />

      <div>
        {product.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {product.categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.id)}`}
                className="rounded-full border border-border-strong px-3 py-1 text-xs font-semibold tracking-wide text-muted uppercase transition-colors hover:border-flame-2/50 hover:text-foreground"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
        <h1 className="font-display mt-3 text-4xl tracking-wide sm:text-5xl">{product.name}</h1>
        <p className="text-flame mt-3 text-lg">{formatCents(minPrice)}</p>
        {product.description && (
          <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">
            {product.description}
          </p>
        )}
        <div className="mt-8">
          <AddToCart product={product} />
        </div>
      </div>
    </section>
  );
}
