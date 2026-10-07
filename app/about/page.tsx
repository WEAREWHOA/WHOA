import Link from "next/link";
import AboutCard from "@/components/about/AboutCard";
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

      {/* Six tiles, two columns, three clean rows.
          
          Two of these used to span both columns, from back when there were
          five and a fifth tile would have left an orphan on the bottom
          row. Six divides by two, so the exception no longer buys
          anything and the uneven grid was just uneven.

          The order is intent, not alphabet, reading left to right and top
          to bottom the way people actually scan a grid:

            1-2  who WHOA is, and how it got here. The narrative pair,
                 and /about/history is the page that answers the
                 informational searches ("when was WHOA founded"), so it
                 sits as high as the link equity on this page can put it.
            3-4  the two that ask for something back. Retail Locations is
                 the highest-intent tile on the page, the one somebody
                 reads right before getting in a car, and its street
                 names and neighbourhoods are the words people search
                 for, so they stay written into the link rather than
                 hidden behind "click here". Partnerships is the trust
                 that makes the first one worth acting on.
            5-6  the long tail. The podcast for anybody still reading,
                 then Contact, which sits directly above the FAQ and
                 policy links below it so the whole practical cluster
                 ends the page together. */}
      {/* auto-rows-fr so all three rows are the height of the tallest
          tile, not just the tiles within each row. A grid already
          equalises its items row by row, which left the last row shorter
          than the two above it: six boxes that are nearly the same size
          read worse than six that obviously are. */}
      <div className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2">
        <AboutCard href="/about/story" title="Our Story &amp; Mission" cta="Read our story">
          &ldquo;WHOA&rdquo; is the word you say when you&apos;re too impressed to find any other
          words. One-of-a-kind designs, made for individuality.
        </AboutCard>

        <AboutCard href="/about/history" title="Our History" cta="See the timeline">
          From the first WHOA song and a hand-dyed tee in Southern California in 2015, through
          beach pop-ups, artist collabs and Art Basel, to our own shop in Ocean Beach.
        </AboutCard>

        <AboutCard href="/stores" title="Retail Locations" cta="Find us in person">
          The WHOADEGA, our shop on Newport Ave in Ocean Beach. Our own section inside Pangaea
          Outpost on Garnet Ave in Pacific Beach. And a stall wherever we&apos;re running an event.
        </AboutCard>

        <AboutCard href="/partnerships" title="Partnerships" cta="See who we support">
          Where our donations go, how we try to keep this eco-friendly, and the artists and
          musicians we work with.
        </AboutCard>

        <PodcastBox />

        <AboutCard href="/contact" title="Contact" cta="Get in touch">
          Pricing, wholesale orders, custom designs, or events. Email, call, or send a message.
        </AboutCard>
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
