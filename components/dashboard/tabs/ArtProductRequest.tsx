"use client";

import { useState } from "react";
import { cancelArtProductRequestAction, requestArtProductChangeAction } from "@/lib/actions";
import { formatCents } from "@/lib/money";
import type { ArtProduct } from "@/lib/artCollective";

const FIELD =
  "mt-1 w-full rounded-lg border border-border-strong bg-surface-raised px-3 py-2 text-sm outline-none focus:border-flame-2";

/**
 * The artist's side of changing something that's already live.
 *
 * Deliberately a request rather than an edit: an approved product is a real
 * listing in a real shop, with a real Square item behind it, so nothing here
 * touches the product itself — it records what they want and waits for
 * staff. Which also means a mistake at this stage is free, and can be
 * withdrawn.
 *
 * The forms stay collapsed until asked for, because the common case is
 * looking at the list, not editing it.
 */
export default function ArtProductRequest({
  code,
  product,
}: {
  code: string;
  product: ArtProduct;
}) {
  const [open, setOpen] = useState<"edit" | "removal" | null>(null);

  if (product.pendingAction) {
    return (
      <div className="border-flame-2/40 bg-flame-2/10 mt-3 rounded-xl border px-4 py-3">
        <p className="text-flame-3 text-sm font-semibold">
          {product.pendingAction === "removal"
            ? "Removal requested — waiting on us"
            : "Changes requested — waiting on us"}
        </p>

        {product.pendingAction === "edit" && product.pendingChanges && (
          <ul className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
            {product.pendingChanges.name && <li>Name → {product.pendingChanges.name}</li>}
            {product.pendingChanges.price_cents !== undefined && (
              <li>Price → {formatCents(product.pendingChanges.price_cents)}</li>
            )}
            {product.pendingChanges.size && <li>Size → {product.pendingChanges.size}</li>}
            {product.pendingChanges.description && <li>New description</li>}
            {product.pendingChanges.details && <li>New details</li>}
          </ul>
        )}

        {product.pendingNote && (
          <p className="mt-2 text-xs text-muted">&ldquo;{product.pendingNote}&rdquo;</p>
        )}

        <form action={cancelArtProductRequestAction} className="mt-3">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="productId" value={product.id} />
          <button
            type="submit"
            className="text-xs font-semibold text-muted uppercase transition-colors hover:text-foreground"
          >
            Cancel this request
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === "edit" ? null : "edit")}
          className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-colors hover:border-flame-2/60"
        >
          Request a change
        </button>
        <button
          type="button"
          onClick={() => setOpen(open === "removal" ? null : "removal")}
          className="rounded-full border border-border-strong px-4 py-1.5 text-xs font-semibold tracking-wide text-muted uppercase transition-colors hover:text-flame-3"
        >
          Request removal
        </button>
      </div>

      {open === "edit" && (
        <form
          action={requestArtProductChangeAction}
          className="mt-3 rounded-xl border border-border p-4"
        >
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="action" value="edit" />

          <p className="text-xs text-muted">
            Fill in only what you want changed — anything you leave blank stays as it is.
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Name
              <input name="name" type="text" placeholder={product.name} className={FIELD} />
            </label>
            <label className="text-sm">
              Price
              <input
                name="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder={(product.priceCents / 100).toFixed(2)}
                className={FIELD}
              />
            </label>
            <label className="text-sm">
              Size
              <input
                name="size"
                type="text"
                placeholder={product.size ?? "Default"}
                className={FIELD}
              />
            </label>
            <label className="text-sm">
              Details
              <input
                name="details"
                type="text"
                placeholder={product.details ?? "Materials, care…"}
                className={FIELD}
              />
            </label>
          </div>

          <label className="mt-3 block text-sm">
            Description
            <textarea
              name="description"
              rows={2}
              placeholder={product.description ?? "How you'd describe it in the shop"}
              className={FIELD}
            />
          </label>

          <label className="mt-3 block text-sm">
            Anything we should know
            <input name="note" type="text" placeholder="Optional" className={FIELD} />
          </label>

          <button type="submit" className="btn-flame mt-4 rounded-full px-6 py-2.5 text-sm">
            Send for approval
          </button>
        </form>
      )}

      {open === "removal" && (
        <form
          action={requestArtProductChangeAction}
          className="border-flame-1/40 mt-3 rounded-xl border p-4"
        >
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="action" value="removal" />

          <p className="text-sm text-muted">
            This asks us to take <span className="text-foreground font-semibold">{product.name}</span>{" "}
            out of the shop. Nothing happens until we approve it, and your sales history stays.
          </p>

          <label className="mt-3 block text-sm">
            Why (optional)
            <input name="note" type="text" placeholder="Sold out, listed by mistake…" className={FIELD} />
          </label>

          <button
            type="submit"
            className="mt-4 rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold text-muted uppercase transition-colors hover:text-flame-3"
          >
            Request removal
          </button>
        </form>
      )}
    </div>
  );
}
