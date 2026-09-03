"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  name: "Name: A to Z",
};

function minPrice(product: Product): number {
  const prices = product.variations.map((v) => v.priceCents);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function totalStock(product: Product): number {
  return product.variations.reduce((sum, v) => sum + (v.inStock ?? 1), 0);
}

export default function ShopGrid({ products }: { products: Product[] }) {
  // A category badge on a product detail page links to /shop?category=<id>
  // so it actually pre-filters the grid, rather than just dumping the
  // shopper back on an unfiltered shop.
  const searchParams = useSearchParams();
  const [categoryId, setCategoryId] = useState<string | null>(() => searchParams.get("category"));
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [hideSoldOut, setHideSoldOut] = useState(false);

  const categories = useMemo(() => {
    const byId = new Map<string, string>();
    for (const product of products) {
      for (const category of product.categories) byId.set(category.id, category.name);
    }
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = products.filter((product) => {
      if (categoryId && !product.categories.some((c) => c.id === categoryId)) return false;
      if (hideSoldOut && product.variations.length > 0 && totalStock(product) <= 0) return false;
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

    return list;
  }, [products, categoryId, hideSoldOut, search, sort]);

  return (
    <div className="relative z-10 mt-10 w-full max-w-6xl">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="w-full rounded-full border border-white/20 bg-black/30 px-5 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-flame-2"
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="flex items-center gap-2 text-xs text-white/70">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs font-semibold tracking-wide text-white uppercase outline-none focus:border-flame-2"
            >
              {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                <option key={key} value={key} className="bg-surface text-foreground">
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setHideSoldOut((v) => !v)}
            aria-pressed={hideSoldOut}
            className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
              hideSoldOut
                ? "border-flame-2 bg-flame-2/15 text-flame-3"
                : "border-white/20 text-white/70 hover:border-flame-2/50 hover:text-white"
            }`}
          >
            Hide sold out
          </button>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCategoryId(null)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
                categoryId === null
                  ? "border-flame-2 bg-flame-2/15 text-flame-3"
                  : "border-white/20 text-white/70 hover:border-flame-2/50 hover:text-white"
              }`}
            >
              All
            </button>
            {categories.map((category) => {
              const active = categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(active ? null : category.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
                    active
                      ? "border-flame-2 bg-flame-2/15 text-flame-3"
                      : "border-white/20 text-white/70 hover:border-flame-2/50 hover:text-white"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-14 text-center text-sm text-white/60">
          No products match your filters — try clearing the search or picking a different
          category.
        </p>
      ) : (
        <div className="mt-14 flex w-full flex-wrap items-start justify-center gap-x-8 gap-y-14">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} delay={i * 0.1} />
          ))}
        </div>
      )}
    </div>
  );
}
