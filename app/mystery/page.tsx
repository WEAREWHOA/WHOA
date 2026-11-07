import type { Metadata } from "next";
import Link from "next/link";

import WorldMap from "@/components/mystery/WorldMap";

const TITLE = "???";

export const metadata: Metadata = {
  title: TITLE,
  description: "The WHOA map. Same places, different world.",
  alternates: { canonical: "/mystery" },
  // Not indexed, and not in the sitemap either. Every link on it goes
  // somewhere that is already indexed properly, so letting a crawler
  // have this would put a page of duplicate nav into search results
  // competing with the pages it points at. Followed, though: the
  // links themselves are real and worth counting.
  robots: { index: false, follow: true },
};

export default function MysteryPage() {
  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        You followed the smoke
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOA <span className="text-flame">World 1</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        The same places as the normal site, somewhere else entirely. Pick a level.
      </p>

      <div className="mt-8">
        <WorldMap />
      </div>

      <p className="mt-6 text-xs text-muted sm:hidden">Drag the map sideways to see the rest.</p>

      <p className="mt-8 text-sm text-muted">
        Had enough?{" "}
        <Link href="/" className="text-flame hover:underline">
          Back to the real homepage
        </Link>
        .
      </p>
    </section>
  );
}
