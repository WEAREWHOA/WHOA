import { formatCents } from "@/lib/money";
import type { VendorProduct, VendorStats } from "@/lib/vendor";

function VendorProductRow({ product }: { product: VendorProduct }) {
  const soldOut = product.variations.length > 0 && product.totalStock <= 0;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border p-4">
      <div className="bg-surface-raised h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[0.6rem] text-muted">WHOA</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        <p className="text-xs text-muted">{formatCents(product.minPriceCents)}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold ${soldOut ? "text-flame-3" : "text-muted"}`}>
        {soldOut ? "Sold out" : `${product.totalStock} in stock`}
      </span>
    </div>
  );
}

export default function VendorTab({
  vendorName,
  stats,
  products,
}: {
  vendorName?: string;
  stats?: VendorStats;
  products?: VendorProduct[];
}) {
  if (!vendorName || !stats || !products) {
    return (
      <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-border-strong">
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/85 px-6 text-center backdrop-blur-sm">
          <span className="text-3xl" aria-hidden>
            🔒
          </span>
          <h3 className="font-display text-2xl">Artist/Vendor — Not Activated</h3>
          <p className="max-w-sm text-sm text-muted">
            Once your vendor account is approved, this tab unlocks live sales totals,
            best-selling items, and payout history from what you sell at the WHOADEGA and
            festival booths.
          </p>
          <button
            type="button"
            disabled
            className="mt-2 cursor-not-allowed rounded-full border border-border-strong px-5 py-2.5 text-sm font-semibold text-muted"
          >
            Request access — coming soon
          </button>
        </div>

        <div aria-hidden className="grid gap-4 p-8 opacity-40 sm:grid-cols-3">
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">Total sales</p>
            <p className="font-display mt-1 text-3xl">$0</p>
          </div>
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">Items sold</p>
            <p className="font-display mt-1 text-3xl">0</p>
          </div>
          <div className="card-surface rounded-xl border border-border p-5">
            <p className="text-xs text-muted uppercase">Next payout</p>
            <p className="font-display mt-1 text-3xl">—</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">Artist/Vendor</span>
          <h3 className="font-display text-2xl">{vendorName}</h3>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Total sales</p>
          <p className="font-display mt-1 text-3xl">{formatCents(stats.totalSalesCents)}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Items sold</p>
          <p className="font-display mt-1 text-3xl">{stats.itemsSold}</p>
        </div>
        <div className="card-surface rounded-xl border border-border p-5">
          <p className="text-xs text-muted uppercase">Orders</p>
          <p className="font-display mt-1 text-3xl">{stats.orderCount}</p>
        </div>
      </div>

      <h4 className="font-display mt-10 text-xl">Your inventory</h4>
      <p className="mt-1 text-sm text-muted">
        Synced from Square — WHOADEGA and the online store, both in one place.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {products.length === 0 ? (
          <p className="rounded-xl border border-border p-5 text-sm text-muted">
            No products matched to your vendor name yet. Sales sync automatically once a Square
            product title ends with your name.
          </p>
        ) : (
          products.map((product) => <VendorProductRow key={product.id} product={product} />)
        )}
      </div>
    </div>
  );
}
