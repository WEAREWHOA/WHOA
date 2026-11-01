import Link from "next/link";
import type { Product } from "@/lib/types";
import { isOutOfStock } from "@/lib/stock";

/**
 * Collections across the front page, swiped sideways.
 *
 * The home page was the brand and nothing else: a shopper arriving on
 * it had to know to go and look for the shop. This is the row of ways
 * in, built from the catalogue itself so it is never out of date and
 * never needs curating by hand.
 *
 * Panels run off the right edge on purpose. The one half-visible
 * alongside is the whole affordance -- it says there is more here and
 * which direction it is in, which a row that fits neatly inside the
 * screen never does.
 *
 * No client JavaScript. Scroll snapping and overflow do all of it, so
 * this costs nothing on a phone and works before hydration.
 */

const PANELS: { bg: string; ink: string }[] = [
  { bg: "linear-gradient(160deg, #3a0a05, #8a2a15 55%, #ff7a00)", ink: "#fff6ef" },
  { bg: "linear-gradient(160deg, #0a1a2e, #1a4a6b 55%, #29e6ff)", ink: "#f0fbff" },
  { bg: "linear-gradient(160deg, #0d0a2a, #3a2a7b 55%, #7b2ff7)", ink: "#f7f2ff" },
  { bg: "linear-gradient(160deg, #2a0016, #7b0040 55%, #ff2d95)", ink: "#fff0f7" },
  { bg: "linear-gradient(160deg, #00210f, #006b38 55%, #2fff8f)", ink: "#f0fff7" },
  { bg: "linear-gradient(160deg, #2a2000, #7b5e00 55%, #ffd12f)", ink: "#fffaec" },
];

interface Collection {
  id: string;
  name: string;
  products: Product[];
}

/**
 * The collections worth showing.
 *
 * Four products each, because the panel holds a two by two and a
 * category that cannot fill one looks broken rather than exclusive.
 * Things in stock come first: a panel of four pieces that all have to
 * be made is a poor advertisement for a shop.
 */
function collectionsFrom(products: Product[]): Collection[] {
  const byCategory = new Map<string, Collection>();

  for (const product of products) {
    for (const category of product.categories) {
      const found = byCategory.get(category.id);
      if (found) found.products.push(product);
      else byCategory.set(category.id, { id: category.id, name: category.name, products: [product] });
    }
  }

  return [...byCategory.values()]
    .map((collection) => ({
      ...collection,
      products: [...collection.products]
        .sort((a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)))
        .slice(0, 4),
    }))
    .filter((collection) => collection.products.length === 4)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 6);
}

export default function CollectionCarousel({ products }: { products: Product[] }) {
  const collections = collectionsFrom(products);
  if (collections.length === 0) return null;

  return (
    <section className="relative z-10 w-full py-14">
      <div className="mx-auto mb-4 flex w-full max-w-6xl items-baseline justify-between px-6">
        <h2 className="font-display text-2xl tracking-wide text-white sm:text-3xl">Shop the collections</h2>
        <Link href="/shop" className="text-xs font-semibold tracking-wide text-white/70 uppercase hover:text-white">
          See all →
        </Link>
      </div>

      {/* Edge to edge, with the padding inside the scroller, so the first
          panel lines up with the heading and the last one can still be
          scrolled clear of the screen edge. */}
      <div className="home-rail">
        {collections.map((collection, i) => {
          const panel = PANELS[i % PANELS.length];
          return (
            <Link
              key={collection.id}
              href={`/shop?category=${encodeURIComponent(collection.id)}`}
              style={{ background: panel.bg, color: panel.ink }}
              className="home-rail-panel group relative overflow-hidden rounded-2xl p-5"
            >
              <div aria-hidden className="event-card-noise absolute inset-0" />
              <h3 className="font-display relative text-2xl leading-tight tracking-wide">
                Shop {collection.name.toLowerCase()}
              </h3>

              <div className="relative mt-4 grid grid-cols-2 gap-2">
                {collection.products.map((product) => (
                  <div
                    key={product.id}
                    className="aspect-square overflow-hidden rounded-xl bg-white/90"
                  >
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        width={320}
                        height={320}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/20">
                        <span className="font-display text-sm text-white/70">WHOA</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <span className="relative mt-4 inline-block text-xs font-bold tracking-[0.12em] uppercase underline underline-offset-4">
                Shop now
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
