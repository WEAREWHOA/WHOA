import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import ProductCard from "@/components/shop/ProductCard";
import { listProducts } from "@/lib/catalog";
import { SITE_URL } from "@/lib/siteUrl";
import type { Product } from "@/lib/types";

export const revalidate = 60;

const TITLE = "One of a Kind Headwear";
const DESCRIPTION =
  "Hand-painted and hand-bleached bucket hats, caps and beanies from WHOA in Ocean Beach, San Diego. Every piece is one of one: when it sells, it does not come back.";

export const metadata: Metadata = {
  alternates: { canonical: "/oneofakindheadwear" },
  title: TITLE,
  description: DESCRIPTION,
  // No openGraph block -- see app/stores/page.tsx. Declaring one without
  // images is what left this page sharing with no picture.
};

/**
 * A URL people were already arriving at, given something to arrive at.
 *
 * ───────────────────────────────────────────────────────────────────────
 * A page rather than a redirect, which was the other option and the one
 * the sibling rules in next.config.ts use. Two reasons it loses here:
 *
 *   The shop's search matches a product's name and description, and
 *   nothing else. No product is called "headwear", so /shop?q=headwear
 *   would land on "No products match your filters" — worse than the 404
 *   it replaces, on a URL that already has traffic.
 *
 *   A 301 to a search URL also throws away the phrase. Search pages are
 *   not indexed, so every link pointing here would hand its weight to
 *   /shop and the words "one of a kind headwear" would rank for nothing.
 *   A real page can answer that query.
 *
 * The matching is deliberately wide and looks at the Square category as
 * well as the name, because what counts as headwear is a merchandising
 * decision made in Square, not a naming convention anybody follows.
 * ───────────────────────────────────────────────────────────────────────
 */
const HEADWEAR_TERMS = [
  "headwear",
  "hat",
  "cap",
  "beanie",
  "visor",
  "headband",
  "bandana",
  "bucket",
  "snapback",
  "trucker",
];

function isHeadwear(product: Product): boolean {
  const haystack = [
    product.name,
    product.description,
    ...product.categories.map((c) => c.name),
  ]
    .join(" ")
    .toLowerCase();

  // Word-boundary matched, not a bare substring. "cap" inside "capsule"
  // and "hat" inside "whatever" would otherwise drag in half the
  // catalogue, and a headwear page listing a hoodie is worse than one
  // listing nothing.
  return HEADWEAR_TERMS.some((term) => new RegExp(`\\b${term}s?\\b`).test(haystack));
}

function buildJsonLd(products: Product[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/oneofakindheadwear`,
    isPartOf: { "@type": "WebSite", name: "WHOA", url: SITE_URL },
    // The products themselves carry their full Product markup on their
    // own pages. Listing them as an ItemList here points at those rather
    // than making a second page claim to be the same items.
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 30).map((product, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: product.name,
        url: `${SITE_URL}/shop/${product.slug}`,
      })),
    },
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default async function OneOfAKindHeadwearPage() {
  let headwear: Product[] = [];
  let failed = false;

  try {
    const products = await listProducts({ onlineOnly: true });
    headwear = products.filter(isHeadwear);
  } catch (err) {
    console.error("Failed to load products for /oneofakindheadwear:", err);
    failed = true;
  }

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      {headwear.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd(headwear) }} />
      )}

      <div className="relative z-10 max-w-2xl text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          Hand finished, never repeated
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide uppercase sm:text-6xl">
          One of a Kind
          <span className="block">Headwear</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Every hat is bleached and painted by hand at the WHOADEGA on Newport Ave, so no two come
          out the same. There is one of each. When it sells, it is gone.
        </p>
      </div>

      <div className="relative z-10 mt-12 w-full max-w-6xl">
        {failed ? (
          <p className="card-surface rounded-2xl p-6 text-center text-sm text-muted">
            The shop is temporarily unavailable. Check back soon, or{" "}
            <Link href="/stores" className="text-flame hover:underline">come and see us</Link>.
          </p>
        ) : headwear.length === 0 ? (
          // Everything sold is the normal state for one-of-ones, so this
          // reads as a sentence about the brand rather than as an error.
          <p className="card-surface rounded-2xl p-6 text-center text-sm text-muted">
            Every hat is currently spoken for. New ones land most weeks:{" "}
            <Link href="/shop" className="text-flame hover:underline">see what else is in</Link>, or{" "}
            <Link href="/events" className="text-flame hover:underline">catch us at an event</Link>.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {headwear.map((product, i) => (
              <ProductCard key={product.id} product={product} delay={i * 0.1} />
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 mt-14 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/shop"
          className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
        >
          Shop everything
        </Link>
        <Link
          href="/stores"
          className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
        >
          Visit the shop
        </Link>
      </div>
    </section>
  );
}
