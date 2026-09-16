import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { productPath, resolveProduct } from "@/lib/catalog";
import AddToCart from "@/components/shop/AddToCart";
import ProductGallery from "@/components/shop/ProductGallery";
import { formatCents } from "@/lib/money";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/types";

export const revalidate = 60;

// schema.org Product markup — lets Google show price/availability directly
// in search results instead of a plain link. JSON.stringify's output is
// escaped (</script> in a Square-sourced name/description could otherwise
// terminate the tag early) before being injected as raw HTML.
function buildProductJsonLd(product: Product, canonicalPath: string): string {
  const prices = product.variations.map((v) => v.priceCents);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const totalStock = product.variations.reduce((sum, v) => sum + (v.inStock ?? 1), 0);
  const inStock = product.variations.length === 0 || totalStock > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.imageUrls.length > 0 ? product.imageUrls : undefined,
    url: `${SITE_URL}${canonicalPath}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (lowPrice / 100).toFixed(2),
      highPrice: (highPrice / 100).toFixed(2),
      offerCount: Math.max(product.variations.length, 1),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
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
