"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { prefillCartAction } from "@/app/cart/actions";
import { useCart } from "@/components/cart/CartProvider";
import { formatCents } from "@/lib/money";

/**
 * The cart, and the link that can fill it.
 *
 * Arriving at /cart?products=VARIATION:QTY,...&coupon=CODE adds those
 * lines and applies the code. That URL is what Meta's Commerce Manager
 * hands a shopper when they tap through from Instagram, and the ids in
 * it are the ones our own feed published, which are Square's variation
 * ids. Nothing is translated on the way.
 *
 * The query string is stripped once the lines are in. Leaving it there
 * would re-add the whole basket on every refresh and on every press of
 * the back button, which is the sort of bug a customer discovers by
 * being charged for six of something.
 */
export default function CartView() {
  const { lines, setQuantity, removeLine, totalCents, addLine } = useCart();
  const router = useRouter();
  const params = useSearchParams();

  const productsParam = params.get("products");
  const couponParam = params.get("coupon");

  const [prefilling, setPrefilling] = useState(Boolean(productsParam));
  const [notice, setNotice] = useState<string | null>(null);
  // Effects run twice in development, and this one has a side effect
  // measured in money.
  const ran = useRef(false);

  useEffect(() => {
    if (!productsParam || ran.current) return;
    ran.current = true;

    prefillCartAction(productsParam, couponParam ?? undefined)
      .then((result) => {
        for (const line of result.lines) {
          const { quantity, ...rest } = line;
          addLine(rest, quantity);
        }

        const parts: string[] = [];
        if (result.couponApplied) parts.push("Your discount is applied.");
        if (result.unknown.length > 0) {
          parts.push(
            result.unknown.length === 1
              ? "One piece from that link has sold out."
              : `${result.unknown.length} pieces from that link have sold out.`,
          );
        }
        setNotice(parts.join(" ") || null);
      })
      .catch(() => setNotice("We couldn't add those automatically. Have a look in the shop."))
      .finally(() => {
        setPrefilling(false);
        // Same page, no query string, no history entry to go back into.
        router.replace("/cart");
      });
  }, [productsParam, couponParam, addLine, router]);

  if (prefilling) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide">Getting your cart ready</h1>
        <p className="mt-3 text-sm text-muted">One moment.</p>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="font-display text-4xl tracking-wide">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">{notice ?? "Find something you love."}</p>
        <Link href="/shop" className="btn-flame mt-8 rounded-full px-8 py-4 text-base">
          Shop WHOA
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl tracking-wide sm:text-5xl">Your cart</h1>

      {notice && (
        <p className="border-flame-2/40 bg-flame-2/10 mt-4 rounded-xl border px-4 py-3 text-sm" role="status">
          {notice}
        </p>
      )}

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
