import Link from "next/link";
import type { Product } from "@/lib/types";
import { formatCents } from "@/lib/money";

export default function ProductCard({ product }: { product: Product }) {
  const prices = product.variations.map((v) => v.priceCents);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const totalStock = product.variations.reduce((sum, v) => sum + (v.inStock ?? 1), 0);
  const soldOut = product.variations.length > 0 && totalStock <= 0;

  return (
    <Link
      href={`/shop/${product.id}`}
      className="card-surface group flex flex-col overflow-hidden rounded-2xl transition-colors hover:border-flame-2/50"
    >
      <div className="bg-surface-raised aspect-square overflow-hidden">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <span className="font-display text-2xl tracking-wide">WHOA</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold">{product.name}</h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-muted">{formatCents(minPrice)}</span>
          {soldOut && <span className="text-xs font-medium text-flame-3">Sold out</span>}
        </div>
      </div>
    </Link>
  );
}
