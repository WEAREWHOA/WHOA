import Link from "next/link";
import type { Metadata } from "next";
import { listProducts } from "@/lib/catalog";
import OutfitBuilder from "@/components/games/outfit-builder/OutfitBuilder";

export const metadata: Metadata = {
  title: "Outfit Builder",
  description: "Pick real WHOADEGA pieces. Download your fit.",
};

// Same as /shop — listProducts() is a live Square fetch, not a Next
// fetch(), so it isn't covered by Next's own fetch cache. Without this,
// the page would be frozen with whatever stock/prices existed at the last
// build and never see a restock or price change without a redeploy.
export const revalidate = 60;

export default async function OutfitBuilderPage() {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let error: string | null = null;

  try {
    products = await listProducts({ onlineOnly: true });
  } catch {
    error = "The outfit builder is temporarily unavailable. Check back soon.";
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center px-6 py-16 text-center">
      <Link href="/games" className="self-start text-sm text-muted hover:text-foreground">
        ← WHOA Games
      </Link>

      <span className="mt-6 text-xs font-semibold tracking-[0.3em] text-muted uppercase">
        WHOA Games
      </span>
      <h1 className="text-psychedelic font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Outfit Builder
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Pick real pieces from the shop, build a fit, and download it as a shareable board.
      </p>

      <div className="mt-10 w-full text-left">
        {error ? (
          <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
            {error}
          </p>
        ) : products.length === 0 ? (
          <p className="text-center text-sm text-muted">No products available right now.</p>
        ) : (
          <OutfitBuilder products={products} />
        )}
      </div>
    </section>
  );
}
