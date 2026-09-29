import Link from "next/link";
import type { Metadata } from "next";

import ComingSoonBadge from "@/components/LockedBadge";

export const metadata: Metadata = {
  alternates: { canonical: "/partnerships" },
  title: "Partnerships",
  description:
    "Where WHOA's donations go, how we try to keep what we make eco-friendly, and the artists and musicians we work with.",
};

/**
 * The detail behind the Partnerships card on /about.
 *
 * Three things a shopper actually wants to know before buying from a
 * small brand that says it cares: where the money goes, what "eco-
 * friendly" means here in concrete terms, and what they can buy that
 * reflects it. The upcycled collection is the last of those, so it's the
 * only thing on the page with a button.
 */

const DONATIONS = [
  {
    org: "The Surfrider Foundation USA",
    href: "https://www.surfrider.org/",
    what: "Protecting the ocean, waves and beaches. The coast this whole thing was made on.",
  },
  {
    org: "Children International",
    href: "https://www.children.org/",
    what: "Health, education and job training for kids growing up in poverty.",
  },
];

/**
 * Written as aims rather than certifications on purpose. Every line here
 * is something the way WHOA already works makes possible: made to
 * order, painted by hand, short runs. None of it claims an audited
 * supply chain, and it shouldn't be dressed up as one.
 */
const ECO_AIMS = [
  {
    title: "Upcycled first",
    body: "Every hand-bleached and hand-painted piece starts as a garment that already exists. Nothing has to be manufactured from scratch for a design to be one of a kind.",
  },
  {
    title: "Made to order, not to the warehouse",
    body: "Custom pieces are painted when someone orders one, and the rest run in short batches. Clothing nobody bought is the biggest waste in this industry, and the surest way to avoid it is not to make it yet.",
  },
  {
    title: "One of a kind by design",
    body: "A piece meant to be the only one of its kind gets kept. Fast fashion depends on things being replaceable, which is the opposite of what we're trying to make.",
  },
  {
    title: "Repair before replace",
    body: "If something we made comes apart, talk to us before you bin it. We'd rather fix a piece than sell you another one.",
  },
  {
    title: "Packed as lightly as we can",
    body: "We aim to reuse and minimise packaging wherever a piece will still arrive in one piece, and to keep adding as little to the parcel as possible.",
  },
  {
    title: "Giving a cut away",
    body: "What we give to the organisations above comes out of what we sold. Growing the business and giving some of it away are meant to be the same motion.",
  },
];

export default function PartnershipsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Who we support
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Partner<span className="text-flame">ships</span>
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
        An investment in our future, the future of our planet, and future generations to come.
        Here&apos;s who that goes to.
      </p>

      <h2 className="font-display mt-12 text-2xl tracking-wide">Donations</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {DONATIONS.map((d) => (
          <div key={d.org} className="card-surface rounded-2xl border border-border p-6">
            {/* The organisation is the heading now. It used to sit under a
                large figure, which made the amount the point of the card
                rather than who it went to. */}
            <a
              href={d.href}
              target="_blank"
              rel="noreferrer"
              className="font-display text-flame text-xl leading-snug hover:underline"
            >
              {d.org} ↗
            </a>
            <p className="mt-3 text-sm leading-relaxed text-muted">{d.what}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Want to point us at a cause, or partner on one? Tell us about it on the{" "}
        <Link href="/contact" className="text-flame font-medium hover:underline">
          contact page
        </Link>
        . We read everything that comes in.
      </p>

      <h2 className="font-display mt-14 text-2xl tracking-wide">
        Trying to be <span className="text-flame">eco-friendly</span>, in as many ways as we can
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        These are things we aim for, not certifications we hold. Some of it is already how we
        work. The rest is what we&apos;re working toward.
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {ECO_AIMS.map((aim) => (
          <li key={aim.title} className="card-surface rounded-2xl border border-border p-6">
            <h3 className="font-display text-lg">{aim.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{aim.body}</p>
          </li>
        ))}
      </ul>

      <div className="card-surface mt-14 rounded-2xl border border-border p-6 sm:p-8">
        <h2 className="font-display text-2xl tracking-wide">
          The <span className="text-flame">Upcycled Collection</span>
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Second-hand and deadstock garments, bleached and painted by hand into something nobody
          else owns. Same idea as everything else we make, with the part that usually gets
          manufactured already accounted for. Because each piece starts from whatever came through
          the door, no two are the same and there&apos;s rarely more than one.
        </p>
        <Link
          href="/shop?q=upcycled"
          className="btn-flame mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] uppercase"
        >
          Shop the Upcycled Collection
        </Link>
      </div>

      <h2 className="font-display mt-14 text-2xl tracking-wide">Artists &amp; musicians</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        We partner directly with independent artists and musicians through the Art Collective and
        the Music Collective. Both opening soon.{" "}
        <ComingSoonBadge className="align-middle text-muted" />
      </p>

      <p className="mt-12 text-sm text-muted">
        <Link href="/about" className="text-flame font-medium hover:underline">
          ← Back to About
        </Link>
      </p>
    </section>
  );
}
