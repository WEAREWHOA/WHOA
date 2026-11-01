import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import { listProducts } from "@/lib/catalog";
import { getAllArtProfileNames } from "@/lib/artCollective";
import { ARTISTS, EXTRA_ARTIST_CATEGORY_NAMES } from "@/lib/artists";
import ShopGrid from "@/components/shop/ShopGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/shop" },
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
  let artistNames: string[] = [...ARTISTS.map((a) => a.name), ...EXTRA_ARTIST_CATEGORY_NAMES];
  try {
    const profiles = await getAllArtProfileNames();
    artistNames = Array.from(new Set([...artistNames, ...profiles.map((p) => p.artistName)]));
  } catch (err) {
    console.error("Failed to load Art Collective profile names for /shop filter grouping:", err);
  }

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-6 sm:py-20">
      <PsychedelicBackground />

      <div className="relative z-10 text-center">
        <span className="hidden text-xs font-semibold tracking-[0.3em] text-white/70 uppercase sm:block">
          WHOADEGA & online store
        </span>
        <h1 className="text-psychedelic font-display text-3xl tracking-wide sm:mt-3 sm:text-6xl">
          Shop WHOA
        </h1>
        <p className="mt-2 hidden max-w-md text-sm text-white/60 sm:mt-3 sm:block">
          Same stock, same prices, whether you&apos;re here or at the booth.
        </p>
      </div>

      {/* Custom pieces have always been arranged by talking to someone,
          and they still are while the editor is shut. The live way sits
          above the locked one, so a shopper who wants a custom piece
          finds the route that works before the one that doesn't. */}
      <div className="relative z-10 order-last mt-10 flex flex-col items-center gap-2 sm:order-none sm:mt-5">
        <Link
          href="/contact"
          className="btn-flame inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.7rem] font-bold tracking-[0.12em] uppercase sm:px-6 sm:py-3 sm:text-xs"
        >
          Order Custom Design
        </Link>

      {/* The editor itself is built and still lives at /custom-design —
            it just isn't open to customers yet, so this is a label rather
            than a link. To reopen it, swap this back for a
            <Link href="/custom-design"> with the same styling. */}
        <span
          aria-disabled="true"
          className="hidden cursor-default items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-xs font-semibold tracking-wide text-white/40 uppercase select-none sm:inline-flex"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Custom Design editor — Coming Soon
        </span>
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
