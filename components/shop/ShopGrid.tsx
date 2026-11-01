"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";
import { compareFeatured, shopBandOf } from "@/lib/shopOrder";
import { isOutOfStock } from "@/lib/stock";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

// Must match ART_COLLECTIVE_CATEGORY_DISPLAY_NAME in lib/catalog.ts — kept
// as a plain string here rather than imported, since that module also
// pulls in server-only Square SDK code this client component shouldn't
// bundle.
const ART_COLLECTIVE_CATEGORY_NAME = "art collective";

interface CategoryPill {
  id: string;
  name: string;
  parentId?: string | null;
}

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  name: "Name: A to Z",
};

/**
 * A plain chip, on or off. For the toggles beside the count, which are
 * states rather than places and should not compete with the colours
 * below.
 */
function chip(active: boolean): string {
  return `shrink-0 rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
    active
      ? "border-flame-2 bg-flame-2/15 text-flame-3"
      : "border-white/20 text-white/70 hover:border-flame-2/50 hover:text-white"
  }`;
}

/**
 * The category row's colours.
 *
 * Solid and bright, one per category, the way a phone shopping app
 * does it: a row of outlines all the same colour is a list, and a row
 * of colours is somewhere to go. Drawn from the palette the cards and
 * the rest of the site already use, so it reads as WHOA rather than as
 * somebody else's app.
 */
const CHIP_COLORS: { bg: string; ink: string }[] = [
  { bg: "#ff7a00", ink: "#140f08" },
  { bg: "#29e6ff", ink: "#04171c" },
  { bg: "#7b2ff7", ink: "#f6f2ff" },
  { bg: "#ff2d95", ink: "#1a0210" },
  { bg: "#2fff8f", ink: "#032013" },
  { bg: "#ffd12f", ink: "#191200" },
];

/**
 * By position, cycling, rather than by a hash of the name.
 *
 * A hash is stabler as categories come and go, and it put two yellow
 * chips next to each other on the first run: at six colours, collisions
 * are common and the one thing the colours have to do is tell adjacent
 * chips apart. Position guarantees that, and the list is sorted by name
 * upstream so it only shifts when a category is actually added.
 */
function chipColor(index: number): { bg: string; ink: string } {
  return CHIP_COLORS[index % CHIP_COLORS.length];
}

function minPrice(product: Product): number {
  const prices = product.variations.map((v) => v.priceCents);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

export default function ShopGrid({ products, artistNames }: { products: Product[]; artistNames: string[] }) {
  // A category badge on a product detail page links to /shop?category=<id>
  // so it actually pre-filters the grid, rather than just dumping the
  // shopper back on an unfiltered shop.
  const searchParams = useSearchParams();
  const [categoryId, setCategoryId] = useState<string | null>(() => searchParams.get("category"));
  // ?q= prefills the search, the same way ?category= prefills the filter.
  // It's what makes an old collection URL like /buckethats land on the
  // bucket hats rather than the whole shop — the search already matches
  // name and description, and every hat says so in both.
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [sort, setSort] = useState<SortOption>("featured");
  const [hideSoldOut, setHideSoldOut] = useState(false);

  const artistNameSet = useMemo(() => new Set(artistNames.map((name) => name.toLowerCase())), [artistNames]);

  // Every Art Collective product carries both the umbrella "Art Collective"
  // category and its own artist's category (see getOrCreateArtistCategoryId
  // in lib/catalog.ts) — keep those out of the product-type row, which is
  // meant to be Apparel, Hats and the like rather than a dozen-plus artist
  // names.
  //
  // The test is Square's own hierarchy: an artist's category is nested
  // under Art Collective, so it's recognised by its parent rather than by
  // its name. Matching on names alone missed anyone spelled differently in
  // Square from the curated list, or added there by hand, and let them
  // through as if they were a kind of product. Names are still checked as
  // a fallback for a category that hasn't been re-parented yet.
  const { productCategories, artistCategories, artistCategoryIds } = useMemo(() => {
    const byId = new Map<string, CategoryPill>();
    for (const product of products) {
      for (const category of product.categories) {
        byId.set(category.id, {
          id: category.id,
          name: category.name,
          parentId: category.parentId ?? null,
        });
      }
    }
    const all = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));

    const isUmbrella = (c: CategoryPill) =>
      c.name.trim().toLowerCase() === ART_COLLECTIVE_CATEGORY_NAME;
    const umbrellaIds = new Set(all.filter(isUmbrella).map((c) => c.id));

    const productCategories: CategoryPill[] = [];
    const artistCategories: CategoryPill[] = [];
    for (const category of all) {
      const key = category.name.trim().toLowerCase();
      const nested = category.parentId != null && umbrellaIds.has(category.parentId);
      if (nested || isUmbrella(category) || artistNameSet.has(key)) {
        artistCategories.push(category);
      } else {
        productCategories.push(category);
      }
    }
    return {
      productCategories,
      artistCategories,
      artistCategoryIds: new Set(artistCategories.map((c) => c.id)),
    };
  }, [products, artistNameSet]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = products.filter((product) => {
      if (categoryId && !product.categories.some((c) => c.id === categoryId)) return false;
      if (hideSoldOut && isOutOfStock(product)) return false;
      if (query) {
        const haystack = `${product.name} ${product.description}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => minPrice(a) - minPrice(b));
    else if (sort === "price-desc") list.sort((a, b) => minPrice(b) - minPrice(a));
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    // Featured is the default, and it leads with WHOA's own range before
    // the Art Collective's. See lib/shopOrder.ts for the full rule.
    else list.sort((a, b) => compareFeatured(a, b, artistCategoryIds));

    return list;
  }, [products, categoryId, hideSoldOut, search, sort, artistCategoryIds]);

  // Where WHOA's own range ends and the collective's begins, so the grid
  // can say so instead of just quietly changing character halfway down.
  // Only under Featured, since that is the only order banded this way,
  // and only with nothing filtered to a single category, where a split
  // would be noise. Index 0 means every match is the collective's, so
  // there is nothing above the line to separate it from.
  const collectiveStartsAt =
    sort === "featured" && !categoryId
      ? filtered.findIndex((product) => shopBandOf(product, artistCategoryIds) === 1)
      : -1;

  return (
    <div className="relative z-10 mt-6 w-full max-w-6xl sm:mt-10">
      {/* Everything you steer the shop with, in one bar that stays put.
          On a phone this used to sit under a full screen of hero, so
          the first thing a shopper could do was scroll. */}
      <div className="shop-controls -mx-6 px-6 py-3 sm:mx-0 sm:rounded-2xl sm:px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-white/70"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search WHOA"
              aria-label="Search products"
              // enterKeyHint puts "Search" on the phone keyboard's
              // return key; the rest stop iOS capitalising and
              // autocorrecting what people type into a product search.
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-full border border-white/30 bg-white/10 py-3.5 pr-11 pl-11 text-base text-white outline-none placeholder:text-white/55 focus:border-flame-2 focus:bg-white/15"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-sm text-white/70"
              >
                ×
              </button>
            )}
          </div>

          {/* One swipeable row. All first, then product types, then the
              way out to the artists. It used to be four stacked rows
              that pushed the products themselves off the screen. */}
          {(productCategories.length > 0 || artistCategories.length > 0) && (
            <div className="shop-chiprow -mx-6 px-6 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                aria-pressed={categoryId === null}
                className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide uppercase transition-transform ${
                  categoryId === null
                    ? "bg-white text-black"
                    : "border border-white/25 text-white/80"
                }`}
              >
                All
              </button>
              {productCategories.map((category, i) => {
                const color = chipColor(i);
                const active = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setCategoryId(active ? null : category.id)}
                    aria-pressed={active}
                    // Colour carries which category it is; the ring
                    // carries which one is chosen. Dimming the rest
                    // would turn a row of places back into a list.
                    style={{ backgroundColor: color.bg, color: color.ink }}
                    className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-bold tracking-wide uppercase transition-transform ${
                      active ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
              {artistCategories.length > 0 && (
                // One link, not a pill per artist. The roster page
                // introduces each artist with their work and their
                // story, which a row of bare names on a product grid
                // can't — and that row grew a pill for every artist who
                // ever joined, duplicates included.
                <Link href="/art-collective" className="shop-artist-link">
                  Shop by artist
                  <span aria-hidden="true"> →</span>
                </Link>
              )}
            </div>
          )}

          {/* How many, and how they are ordered, on one line. The count
              is the thing a search needs to answer first. */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-white/60">
              {filtered.length.toLocaleString()} item{filtered.length === 1 ? "" : "s"}
              {search ? ` for “${search.trim()}”` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHideSoldOut((v) => !v)}
                aria-pressed={hideSoldOut}
                className={chip(hideSoldOut)}
              >
                In stock
              </button>
              <label>
                <span className="sr-only">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs font-semibold tracking-wide text-white uppercase outline-none focus:border-flame-2"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <option key={key} value={key} className="bg-surface text-foreground">
                      {SORT_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-sm text-white/60">
          No products match your filters — try clearing the search or picking a different
          category.
        </p>
      ) : (
        <div className="mt-6 grid w-full grid-cols-2 gap-x-3 gap-y-6 sm:mt-14 sm:flex sm:flex-wrap sm:items-start sm:justify-center sm:gap-x-8 sm:gap-y-14">
          {filtered.map((product, i) => (
            <Fragment key={product.id}>
              {i === collectiveStartsAt && i > 0 && (
                // w-full breaks the flex-wrap row, so this sits on its own
                // line however many cards happen to precede it.
                <div className="col-span-2 w-full pt-4 text-center">
                  <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
                    From the Art Collective
                  </span>
                  <p className="mt-2 text-sm text-white/50">
                    Work by the artists who sell with us.
                  </p>
                </div>
              )}
              <ProductCard product={product} delay={i * 0.1} />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

