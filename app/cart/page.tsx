"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";

export default function CartPage() {
  const { lines, setQuantity, removeLine, totalCents } = useCart();

  if (lines.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">Find something you love.</p>
        <Link href="/shop" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
          Shop WHOA
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Your cart</h1>

      <div className="mt-8 flex flex-col gap-4">
        {lines.map((line) => (
          <div key={line.variationId} className="card-surface flex items-center gap-4 rounded-xl p-4">
            <div className="bg-surface-raised h-16 w-16 shrink-0 overflow-hidden rounded-lg">
              {line.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={line.imageUrl}
                  alt={line.productName}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{line.productName}</p>
              <p className="text-xs text-muted">{line.variationName}</p>
            </div>
            <input
              type="number"
              min={1}
              aria-label={`Quantity for ${line.productName} (${line.variationName})`}
              value={line.quantity}
              onChange={(e) => setQuantity(line.variationId, Number(e.target.value))}
              className="w-16 rounded-lg border border-border-strong bg-surface-raised px-2 py-1.5 text-center text-sm outline-none focus:border-flame-2"
            />
            <p className="w-20 text-right text-sm font-medium">
              {formatCents(line.priceCents * line.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeLine(line.variationId)}
              className="hover:text-flame-3 text-xs text-muted transition-colors"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="card-surface mt-8 flex items-center justify-between rounded-xl p-6">
        <span className="text-sm text-muted">Subtotal</span>
        <span className="font-display text-2xl tracking-wide">{formatCents(totalCents)}</span>
      </div>

      <Link
        href="/checkout"
        className="btn-flame mt-6 block rounded-full px-8 py-4 text-center text-base"
      >
        Checkout
      </Link>
    </section>
  );
}
