import Link from "next/link";
import PodcastBox from "@/components/about/PodcastBox";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // Self-canonical, so the ?cfa=gpl / ?si=true tracking variants
  // Square Online sprayed around consolidate here instead of
  // competing as separate pages.
  alternates: { canonical: "/about" },
  title: "About",
  description:
    "WHOA's story, mission, the podcast, partnerships, where to find us in person, and how to get in touch.",
};

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        The full picture
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        About <span className="text-flame">WHOA</span>
      </h1>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Link
          href="/about/story"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
        >
          <h2 className="font-display text-2xl">Our Story &amp; Mission</h2>
          <p className="mt-2 text-sm text-muted">
            &ldquo;WHOA&rdquo; is the word you say when you&apos;re too impressed to find any
            other words — one-of-a-kind designs, made for individuality.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            Read our story →
          </span>
        </Link>

        <Link
          href="/contact"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
        >
          <h2 className="font-display text-2xl">Contact</h2>
          <p className="mt-2 text-sm text-muted">
            Pricing, wholesale orders, custom designs, or events — email, call, or send a message.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            Get in touch →
          </span>
        </Link>

        <PodcastBox />

        {/* The fourth card, so the four close a square. It used to be a
            wide bar under the other three holding every donation figure
            and both collectives — too much to read in a summary grid, so
            the detail moved to /partnerships. */}
        <Link
          href="/partnerships"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50"
        >
          <h2 className="font-display text-2xl">Partnerships</h2>
          <p className="mt-2 text-sm text-muted">
            Where our donations go, how we try to keep this eco-friendly, and the artists and
            musicians we work with.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            See who we support →
          </span>
        </Link>

        {/* Across both columns rather than a fifth box in the grid: four
            cards close a square and a fifth would leave an orphan on the
            bottom row.

            It also earns the width. This is the only card that answers
            "where can I actually go and buy this", which is a question
            somebody asks right before getting in a car, and the street
            names in it are the words people search for. A link from a
            page that is already crawled this heavily, with the
            neighbourhoods written out rather than hidden behind "click
            here", is most of what makes /stores findable at all. */}
        <Link
          href="/stores"
          className="card-surface group rounded-2xl border border-border p-6 transition-colors hover:border-flame-2/50 sm:col-span-2"
        >
          <h2 className="font-display text-2xl">Retail Locations</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The WHOADEGA, our shop on Newport Ave in Ocean Beach. Our own section inside Pangaea
            Outpost on Garnet Ave in Pacific Beach. And a stall wherever we&apos;re running an
            event.
          </p>
          <span className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase">
            Find us in person →
          </span>
        </Link>
      </div>

      <h2 className="font-display mt-14 text-2xl tracking-wide">More info</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/faq"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          FAQ
        </Link>
        <Link
          href="/shipping-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Shipping Policy
        </Link>
        <Link
          href="/return-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Return Policy
        </Link>
        <Link
          href="/privacy-policy"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Privacy Policy
        </Link>
        <Link
          href="/terms-of-service"
          className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50"
        >
          Terms of Service
        </Link>
      </div>
    </section>
  );
}
