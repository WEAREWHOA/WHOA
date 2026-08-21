"use client";

import Link from "next/link";
import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { Product } from "@/lib/types";
import { formatCents } from "@/lib/money";
import { useCart } from "@/components/cart/CartProvider";

// Same idea as lib/artists.ts's PALETTE — Square products don't carry a
// brand color, so this cycles a deterministic (hash-based, not random) look
// per product instead of every card being the same flat gray.
const PALETTE: { accent: string; gradient: [string, string, string] }[] = [
  { accent: "#ff2fb0", gradient: ["#2a0a3a", "#7b2ff7", "#ff2fb0"] },
  { accent: "#29e6ff", gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"] },
  { accent: "#baff29", gradient: ["#0d3b3b", "#1a8a6b", "#baff29"] },
  { accent: "#ff8a29", gradient: ["#c97a2f", "#e0a94e", "#ff8a29"] },
  { accent: "#7b2ff7", gradient: ["#1a0a2e", "#4a1a6b", "#7b2ff7"] },
  { accent: "#fff229", gradient: ["#3a3a0a", "#8a8a1a", "#fff229"] },
  { accent: "#ff2f1a", gradient: ["#3a0a05", "#8a2a15", "#ff2f1a"] },
];
const ROTATES = [-4, 3, -2, 5, -5, 2, -3, 4];

function hashIndex(id: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % mod;
}

export default function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const { addLine } = useCart();
  const [added, setAdded] = useState(false);

  const { accent, gradient } = PALETTE[hashIndex(product.id, PALETTE.length)];
  const rotate = ROTATES[hashIndex(product.id + "r", ROTATES.length)];
  const [c1, c2, c3] = gradient;

  const prices = product.variations.map((v) => v.priceCents);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const totalStock = product.variations.reduce((sum, v) => sum + (v.inStock ?? 1), 0);
  const soldOut = product.variations.length > 0 && totalStock <= 0;
  const singleVariation = product.variations.length === 1;

  function handlePointerMove(e: PointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `rotate(${rotate}deg) perspective(900px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-6px) scale(1.03)`;
  }

  function handlePointerLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `rotate(${rotate}deg)`;
  }

  function addSingleVariation() {
    const variation = product.variations[0];
    addLine({
      variationId: variation.id,
      productId: product.id,
      productName: product.name,
      variationName: variation.name,
      priceCents: variation.priceCents,
      imageUrl: product.imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  // A real <button> can't legally nest inside the card's <Link> (<a>) — the
  // browser's HTML parser silently breaks that nesting, which then breaks
  // both this control and the outer link's own click handling. A span with
  // a button role sidesteps that while staying keyboard-accessible.
  function handleQuickAdd(e: MouseEvent<HTMLSpanElement>) {
    if (!singleVariation || soldOut) return;
    e.preventDefault();
    e.stopPropagation();
    addSingleVariation();
  }

  function handleQuickAddKeyDown(e: KeyboardEvent<HTMLSpanElement>) {
    if (!singleVariation || soldOut) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    addSingleVariation();
  }

  return (
    <Link
      ref={ref}
      href={`/shop/${product.id}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          transform: `rotate(${rotate}deg)`,
          animationDelay: `${delay}s`,
          "--accent": accent,
        } as React.CSSProperties
      }
      className="event-card event-float group relative block w-full max-w-xs shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] transition-shadow duration-300 hover:shadow-[0_25px_65px_-15px_var(--accent)]"
    >
      <div className="bg-surface-raised relative aspect-square w-full overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="relative flex h-full w-full items-center justify-center"
            style={{ background: `linear-gradient(160deg, ${c1}, ${c2} 55%, ${c3})` }}
          >
            <div aria-hidden className="event-card-noise absolute inset-0" />
            <span className="text-psychedelic font-display relative text-2xl tracking-wide">WHOA</span>
          </div>
        )}
        {soldOut && (
          <span className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-white uppercase">
            Sold out
          </span>
        )}
      </div>

      <div className="relative z-10 bg-black/70 p-4 backdrop-blur-sm">
        <h3 className="truncate text-sm font-semibold text-white">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-display text-lg" style={{ color: accent }}>
            {formatCents(minPrice)}
          </span>
          {!soldOut && <span className="text-[0.65rem] text-white/60">{totalStock} in stock</span>}
        </div>

        <span
          role="button"
          tabIndex={soldOut ? -1 : 0}
          aria-disabled={soldOut}
          onClick={handleQuickAdd}
          onKeyDown={handleQuickAddKeyDown}
          className={`mt-3 block w-full scale-100 rounded-full px-4 py-2.5 text-center text-xs font-semibold tracking-wide uppercase transition-[scale,background-color,color] duration-300 group-hover:scale-[1.04] ${
            soldOut ? "cursor-not-allowed border border-white/20 text-white/40" : "btn-flame"
          }`}
        >
          {soldOut ? "Sold out" : added ? "Added ✓" : singleVariation ? "Add to cart" : "Choose options"}
        </span>
      </div>
    </Link>
  );
}
