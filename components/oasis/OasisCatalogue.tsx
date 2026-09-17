"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCents } from "@/lib/money";
import type { OasisItem } from "@/lib/oasisCatalogue";
import {
  addToOasisOrder,
  oasisOrderCount,
  useOasisOrder,
} from "@/components/oasis/oasisOrder";
import OasisOrderPanel from "@/components/oasis/OasisOrderPanel";

function ItemCard({ item }: { item: OasisItem }) {
  const [size, setSize] = useState(item.sizes[0] ?? null);
  const [added, setAdded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function add() {
    addToOasisOrder({
      slug: item.slug,
      name: item.name,
      size: item.sizes.length > 0 ? size : null,
      unitPriceCents: item.priceCents,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="oasis-card group flex flex-col overflow-hidden rounded-2xl">
      <div className="oasis-card-art relative flex aspect-4/5 items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          // No photography yet — the initials stand in rather than a broken
          // image box, so the grid still reads as a catalogue.
          <span className="font-display text-6xl tracking-widest text-[#f7f0e6]/25">
            {item.name
              .split(" ")
              .slice(0, 2)
              .map((word) => word[0])
              .join("")}
          </span>
        )}
        <span className="oasis-chip absolute top-3 left-3">Pre-order</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl tracking-wide">{item.name}</h3>
        {item.tagline && <p className="mt-1 text-sm text-[#c9b8a4]">{item.tagline}</p>}

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 self-start text-xs font-semibold tracking-[0.15em] text-[#e8a33d] uppercase"
          aria-expanded={expanded}
        >
          {expanded ? "Less" : "Details"}
        </button>
        {expanded && <p className="mt-2 text-sm leading-relaxed text-[#c9b8a4]">{item.info}</p>}

        {item.leadTime && <p className="mt-3 text-xs text-[#9a8b79]">{item.leadTime}</p>}

        {item.sizes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                aria-pressed={size === option}
                className={`oasis-size ${size === option ? "oasis-size-on" : ""}`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="font-display text-lg">{formatCents(item.priceCents)}</span>
          <button type="button" onClick={add} className="oasis-btn">
            {added ? "Added ✓" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function OasisCatalogue({
  items,
  usingPlaceholders,
}: {
  items: OasisItem[];
  usingPlaceholders: boolean;
}) {
  const [category, setCategory] = useState<string>("All");
  const [panelOpen, setPanelOpen] = useState(false);
  const order = useOasisOrder();
  const count = oasisOrderCount(order);

  const categories = useMemo(
    () => ["All", ...[...new Set(items.map((item) => item.category))].sort()],
    [items],
  );
  const shown = category === "All" ? items : items.filter((item) => item.category === category);

  return (
    <div className="oasis-root min-h-screen">
      <header className="oasis-header sticky top-0 z-30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/oasis" className="font-display text-2xl tracking-[0.2em]">
            OASIS<span className="text-[#e8a33d]">.</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* The only way back to the main site — deliberately quiet, so
                the catalogue reads as its own place rather than a section. */}
            <Link href="/" className="text-xs tracking-[0.15em] text-[#9a8b79] uppercase hover:text-[#f7f0e6]">
              ← WHOA
            </Link>
            <button type="button" onClick={() => setPanelOpen(true)} className="oasis-btn">
              Order {count > 0 && <span className="oasis-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-6">
        <p className="text-xs font-semibold tracking-[0.3em] text-[#e8a33d] uppercase">
          Pre-order catalogue
        </p>
        <h1 className="font-display mt-4 text-5xl leading-none tracking-wide sm:text-7xl">
          OASIS CATALOGUE
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#c9b8a4]">
          A small, separate collection of special pieces — made to order or produced in short runs.
          Nothing here is stocked. Add what you want to your order and we&apos;ll confirm timing and
          payment with you directly.
        </p>

        {usingPlaceholders && (
          <p className="mt-6 rounded-lg border border-[#e8a33d]/40 bg-[#e8a33d]/10 px-4 py-3 text-xs text-[#e8a33d]">
            Showing placeholder items — run migration 0027 to load the real catalogue from the
            database.
          </p>
        )}
      </section>

      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="flex flex-wrap gap-2 border-b border-[#f7f0e6]/10 pb-6">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              aria-pressed={category === name}
              className={`oasis-filter ${category === name ? "oasis-filter-on" : ""}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        {shown.length === 0 ? (
          <p className="py-20 text-center text-sm text-[#9a8b79]">
            Nothing in the catalogue yet — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <ItemCard key={item.slug} item={item} />
            ))}
          </div>
        )}
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pt-8 pb-28 text-xs text-[#6f6255]">
        OASIS is a pre-order catalogue — separate from the WHOA shop, and not charged at checkout.
      </footer>

      {/* Sticky on mobile, where the header button scrolls out of reach. */}
      {count > 0 && !panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="oasis-sticky-bar md:hidden"
        >
          View order · {count}
        </button>
      )}

      {panelOpen && <OasisOrderPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}
