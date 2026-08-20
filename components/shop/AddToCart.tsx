"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import type { Product } from "@/lib/types";
import { formatCents } from "@/lib/money";

export default function AddToCart({ product }: { product: Product }) {
  const { addLine } = useCart();
  const router = useRouter();
  const [variationId, setVariationId] = useState(product.variations[0]?.id ?? "");
  const [added, setAdded] = useState(false);

  const variation = product.variations.find((v) => v.id === variationId);
  const soldOut = !variation || (variation.inStock !== null && variation.inStock <= 0);

  function handleAdd() {
    if (!variation || soldOut) return;
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

  return (
    <div className="flex flex-col gap-4">
      {product.variations.length > 1 && (
        <div>
          <label htmlFor="variation" className="text-sm font-medium">
            Options
          </label>
          <select
            id="variation"
            value={variationId}
            onChange={(e) => setVariationId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
          >
            {product.variations.map((v) => (
              <option key={v.id} value={v.id} disabled={v.inStock !== null && v.inStock <= 0}>
                {v.name} — {formatCents(v.priceCents)}
                {v.inStock !== null && v.inStock <= 0 ? " (sold out)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        className="btn-flame rounded-full px-8 py-4 text-base disabled:cursor-not-allowed disabled:opacity-50"
      >
        {soldOut ? "Sold out" : added ? "Added" : "Add to cart"}
      </button>

      {added && (
        <button
          type="button"
          onClick={() => router.push("/cart")}
          className="text-flame text-sm font-medium"
        >
          View cart →
        </button>
      )}
    </div>
  );
}
