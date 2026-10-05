import type { Metadata } from "next";
import { Suspense } from "react";

import CartView from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Your cart",
  // A cart is one person's basket, and with ?products= on it the URL is
  // a specific basket. Nothing here should ever be a search result.
  robots: { index: false, follow: true },
};

/**
 * Reading the query string needs a Suspense boundary, and the boundary
 * is the honest fallback anyway: somebody arriving from Instagram with a
 * basket attached should be told their cart is being prepared rather
 * than shown an empty one for a beat.
 */
export default function CartPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
          <h1 className="font-display text-4xl tracking-wide">Getting your cart ready</h1>
        </section>
      }
    >
      <CartView />
    </Suspense>
  );
}
