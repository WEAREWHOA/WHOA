import type { Product } from "@/lib/types";
import { availableStock, isOutOfStock } from "@/lib/stock";

export default function InventoryTab({ products }: { products: Product[] }) {
  const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="font-display text-2xl">Stock overview</h2>
      <p className="mt-1 text-sm text-muted">Live from Square — same numbers as the shop and till.</p>

      {sorted.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No products found.</p>
      ) : (
        <div className="mt-6 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {sorted.map((product) => {
            // A stock report, so this still says "none left" rather than
            // "pre-order" -- staff are asking what is on the shelf, not
            // what can be sold. It just works it out the same way every
            // other surface now does, instead of summing the counts and
            // letting one oversold variation hide a sibling that has some.
            const totalStock = availableStock(product);
            const soldOut = isOutOfStock(product);
            const low = !soldOut && totalStock !== null && totalStock > 0 && totalStock <= 3;

            return (
              <div key={product.id} className="flex items-center gap-3 bg-surface p-3">
                <div className="bg-surface-raised h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[0.55rem] text-muted">
                      WHOA
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  {product.variations.length > 1 && (
                    <p className="text-xs text-muted">{product.variations.length} variants</p>
                  )}
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    soldOut
                      ? "bg-flame-1/10 text-flame-3"
                      : low
                        ? "bg-flame-2/10 text-flame-2"
                        : "bg-white/5 text-muted"
                  }`}
                >
                  {soldOut
                    ? "None left"
                    : totalStock === null
                      ? "Not tracked"
                      : `${totalStock} in stock`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        {sorted.length} product{sorted.length === 1 ? "" : "s"}
      </p>
    </div>
  );
}
