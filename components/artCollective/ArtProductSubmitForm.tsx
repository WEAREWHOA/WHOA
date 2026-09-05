"use client";

import { useState } from "react";
import { submitArtProductsAction } from "@/lib/actions";

const MAX_PRODUCTS = 5;

export default function ArtProductSubmitForm({ code }: { code: string }) {
  const [count, setCount] = useState(1);

  return (
    <form action={submitArtProductsAction} className="mt-4 flex flex-col gap-6">
      <input type="hidden" name="code" value={code} />

      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border-strong p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Product {i + 1}</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`product-${i}-name`} className="text-xs text-muted">
                Name
              </label>
              <input
                id={`product-${i}-name`}
                name={`product-${i}-name`}
                type="text"
                required={i === 0}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor={`product-${i}-price`} className="text-xs text-muted">
                Price (USD)
              </label>
              <input
                id={`product-${i}-price`}
                name={`product-${i}-price`}
                type="number"
                step="0.01"
                min="0"
                required={i === 0}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor={`product-${i}-size`} className="text-xs text-muted">
                Size <span className="text-muted">(optional)</span>
              </label>
              <input
                id={`product-${i}-size`}
                name={`product-${i}-size`}
                type="text"
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
              />
            </div>
            <div>
              <label htmlFor={`product-${i}-photos`} className="text-xs text-muted">
                Photos
              </label>
              <input
                id={`product-${i}-photos`}
                name={`product-${i}-photos`}
                type="file"
                accept="image/*"
                multiple
                className="mt-1 w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface-raised file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor={`product-${i}-description`} className="text-xs text-muted">
              Description <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id={`product-${i}-description`}
              name={`product-${i}-description`}
              rows={2}
              className="mt-1 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
            />
          </div>

          <div className="mt-3">
            <label htmlFor={`product-${i}-details`} className="text-xs text-muted">
              Details / specs <span className="text-muted">(optional)</span>
            </label>
            <textarea
              id={`product-${i}-details`}
              name={`product-${i}-details`}
              rows={2}
              placeholder="Materials, care instructions, dimensions..."
              className="mt-1 w-full resize-none rounded-lg border border-border-strong bg-surface-raised px-4 py-2.5 text-sm outline-none focus:border-flame-2"
            />
          </div>
        </div>
      ))}

      {count < MAX_PRODUCTS && (
        <button
          type="button"
          onClick={() => setCount((c) => Math.min(MAX_PRODUCTS, c + 1))}
          className="self-start rounded-full border border-border-strong px-5 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          + Add another product ({count}/{MAX_PRODUCTS})
        </button>
      )}

      <div>
        <span className="text-sm font-medium">Would you also like to submit for retail store / events?</span>
        <p className="mt-1 text-xs text-muted">
          Every approved product goes into the online store either way — this is about whether
          staff should also stock or bring physical units.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm has-[:checked]:border-flame-2">
            <input type="radio" name="alsoRetailEvents" value="no" required className="accent-[var(--flame-2)]" />
            Online store only
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-raised px-4 py-2 text-sm has-[:checked]:border-flame-2">
            <input type="radio" name="alsoRetailEvents" value="yes" required className="accent-[var(--flame-2)]" />
            Online store + retail store &amp; events
          </label>
        </div>
      </div>

      <button type="submit" className="btn-flame self-start rounded-full px-8 py-3 text-sm">
        Submit for review
      </button>
    </form>
  );
}
