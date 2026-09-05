import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import { listProducts } from "@/lib/catalog";
import { getAllArtProfileNames } from "@/lib/artCollective";
import { ARTISTS } from "@/lib/artists";
import ShopGrid from "@/components/shop/ShopGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop WHOA apparel, art, and gear — straight from the WHOADEGA.",
};

export default async function ShopPage() {
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let error: string | null = null;

  try {
    products = await listProducts({ onlineOnly: true });
  } catch (err) {
    // Log the real cause server-side (visible in Vercel's function logs) —
    // shoppers only ever see the friendly fallback message below.
    console.error("Failed to load products for /shop:", err);
    error = "The shop is temporarily unavailable. Check back soon.";
  }

  // Lets ShopGrid split its category filter pills into "shop by category"
  // vs. "shop by artist" instead of one long mixed row — best-effort only,
  // a Supabase hiccup here shouldn't take down the whole shop, just fall
  // back to grouping by the static curated list alone.
  let artistNames: string[] = ARTISTS.map((a) => a.name);
  try {
    const profiles = await getAllArtProfileNames();
    artistNames = Array.from(new Set([...artistNames, ...profiles.map((p) => p.artistName)]));
  } catch (err) {
    console.error("Failed to load Art Collective profile names for /shop filter grouping:", err);
  }

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
          WHOADEGA & online store
        </span>
        <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide sm:text-6xl">
          Shop WHOA
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/60">
          Same stock, same prices, whether you&apos;re here or at the booth.
        </p>
        <Link
          href="/custom-design"
          className="relative z-10 mt-5 inline-block rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/80 uppercase hover:border-flame-2/60 hover:text-white"
        >
          Try the Custom Design editor (test) →
        </Link>
      </div>

      {error && (
        <p className="relative z-10 mt-10 rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {error}
        </p>
      )}

      {!error && products.length === 0 && (
        <p className="relative z-10 mt-10 text-sm text-white/60">No products are available right now.</p>
      )}

      {!error && products.length > 0 && (
        <Suspense>
          <ShopGrid products={products} artistNames={artistNames} />
        </Suspense>
      )}
    </section>
  );
}
