"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import type { Product, ProductVariation } from "@/lib/types";
import { formatCents } from "@/lib/money";

function findVariation(
  variations: ProductVariation[],
  selected: Record<string, string>,
  optionIds: string[],
): ProductVariation | undefined {
  return variations.find((v) => optionIds.every((optionId) => v.optionValueIds[optionId] === selected[optionId]));
}

// Whether choosing `valueId` for `optionId` still has a matching variation,
// given everything else currently selected — lets an incomplete option
// matrix (e.g. "Black" only comes in S/M, not L) disable the combinations
// that don't exist instead of silently landing on "no variation found".
function isValueAvailable(
  variations: ProductVariation[],
  optionIds: string[],
  selected: Record<string, string>,
  optionId: string,
  valueId: string,
): boolean {
  return variations.some(
    (v) =>
      v.optionValueIds[optionId] === valueId &&
      optionIds.every((id) => id === optionId || v.optionValueIds[id] === selected[id]),
  );
}

export default function AddToCart({ product }: { product: Product }) {
  const { addLine } = useCart();
  const router = useRouter();

  // Square's structured Item Options (Size, Color, etc.) — one selector per
  // option, combined to resolve the matching variation. Falls back to a
  // single combined dropdown below for a product that doesn't use Item
  // Options at all (product.options is empty), which is most of the
  // catalog today.
  const hasOptions = product.options.length > 0;
  const optionIds = useMemo(() => product.options.map((o) => o.id), [product.options]);

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(() => {
    const first = product.variations[0];
    const initial: Record<string, string> = {};
    for (const option of product.options) {
      initial[option.id] = first?.optionValueIds[option.id] ?? option.values[0]?.id ?? "";
    }
    return initial;
  });

  const [variationId, setVariationId] = useState(product.variations[0]?.id ?? "");
  const [added, setAdded] = useState(false);

  const variation = hasOptions
    ? findVariation(product.variations, selectedValues, optionIds)
    : product.variations.find((v) => v.id === variationId);
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
      {hasOptions
        ? product.options.map(
            (option) =>
              option.values.length > 1 && (
                <div key={option.id}>
                  <label className="text-sm font-medium">{option.name}</label>
                  {option.showColors ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {option.values.map((value) => {
                        const active = selectedValues[option.id] === value.id;
                        const available = isValueAvailable(
                          product.variations,
                          optionIds,
                          selectedValues,
                          option.id,
                          value.id,
                        );
                        return (
                          <button
                            key={value.id}
                            type="button"
                            disabled={!available}
                            onClick={() => setSelectedValues((prev) => ({ ...prev, [option.id]: value.id }))}
                            title={value.name}
                            aria-label={value.name}
                            aria-pressed={active}
                            className={`h-9 w-9 shrink-0 rounded-full border-2 transition-transform disabled:cursor-not-allowed disabled:opacity-30 ${
                              active ? "border-flame-2 scale-110" : "border-border-strong"
                            }`}
                            style={{ backgroundColor: value.color ?? "#ffffff" }}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <select
                      value={selectedValues[option.id] ?? ""}
                      onChange={(e) => setSelectedValues((prev) => ({ ...prev, [option.id]: e.target.value }))}
                      className="mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2"
                    >
                      {option.values.map((value) => {
                        const available = isValueAvailable(
                          product.variations,
                          optionIds,
                          selectedValues,
                          option.id,
                          value.id,
                        );
                        return (
                          <option key={value.id} value={value.id} disabled={!available}>
                            {value.name}
                            {!available ? " (unavailable)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              ),
          )
        : product.variations.length > 1 && (
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

      {hasOptions && (
        <p className="text-sm text-muted">
          {variation ? formatCents(variation.priceCents) : "This combination isn't available."}
        </p>
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
