import type { Metadata } from "next";
import Link from "next/link";

import Town from "@/components/whoakemon/Town";
import { WAYS_IN } from "@/components/whoakemon/town";

const TITLE = "WHOAkémon";

export const metadata: Metadata = {
  title: TITLE,
  description: "WHOA Town. Walk around it.",
  alternates: { canonical: "/whoakemon" },
  // Same call as /mystery: every link on it goes somewhere already
  // indexed properly, so letting a crawler have this would put a
  // page of duplicate nav into search competing with the pages it
  // points at. Followed, because the links are real.
  robots: { index: false, follow: true },
};

export default function WhoakemonPage() {
  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Welcome to the world of
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOA<span className="text-flame">kémon</span>
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        WHOA Town. Walk around with the arrow keys, the pad, or a swipe. Every door is a real page.
      </p>

      <div className="mt-8">
        <Town />
      </div>

      {/* Not a fallback that appears when something fails. Just
          there, because a navigation page that can only be used with
          four arrow keys and a working pointer is not one. */}
      <div className="mt-10 border-t border-border pt-6">
        <h2 className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Every door, as a plain list
        </h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {Object.values(WAYS_IN).map((way) => (
            <li key={way.href}>
              <Link href={way.href} className="text-sm hover:text-flame">
                <span className="font-semibold">{way.name}</span>
                <span className="text-muted"> — {way.href}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-8 text-sm text-muted">
        Had enough?{" "}
        <Link href="/" className="text-flame hover:underline">
          Back to the real homepage
        </Link>
        , or try{" "}
        <Link href="/mystery" className="text-flame hover:underline">
          the other one
        </Link>
        .
      </p>
    </section>
  );
}
