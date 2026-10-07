import type { Metadata } from "next";
import Link from "next/link";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import { HISTORY, HISTORY_DESCRIPTION } from "@/lib/history";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  alternates: { canonical: "/about/history" },
  title: "Our History: 2015 to Today",
  description: HISTORY_DESCRIPTION,
  openGraph: {
    title: "The History of WHOA, 2015 to Today",
    description: HISTORY_DESCRIPTION,
    url: `${SITE_URL}/about/history`,
    type: "article",
  },
};

/**
 * WHOA, year by year.
 *
 * Here for the searches /about/story doesn't answer — "when was WHOA
 * founded", "who started WHOA", "WHOA Ocean Beach shop" — so the answer
 * is a plain paragraph at the top, every year is its own <h2> with an
 * anchor, and the same facts go out as AboutPage + Organization +
 * BreadcrumbList markup. All of it is server-rendered; the background
 * canvas and the scroll-in animation are decoration a crawler can skip.
 */
function buildJsonLd(): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        name: "The History of WHOA",
        description: HISTORY_DESCRIPTION,
        url: `${SITE_URL}/about/history`,
        mainEntity: {
          "@type": "Organization",
          name: "WHOA",
          alternateName: "WE ARE WHOA",
          url: SITE_URL,
          foundingDate: "2015",
          // Southern California, matching the page. The narrower claim
          // belongs to the business rather than the founding: the
          // Organization markup in lib/organization.ts still places WHOA
          // in San Diego, California, which is what local search reads,
          // and the shop and beach pop-up entries below name the city
          // repeatedly. Structured data that contradicts the visible page
          // is the one thing it must never do.
          foundingLocation: { "@type": "Place", name: "Southern California" },
          founder: {
            "@type": "Person",
            name: "WASANI",
            url: `${SITE_URL}/music-collective/wasani`,
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "About", item: `${SITE_URL}/about` },
          { "@type": "ListItem", position: 3, name: "History", item: `${SITE_URL}/about/history` },
        ],
      },
    ],
  };

  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default function HistoryPage() {
  return (
    <div className="relative flex-1 overflow-hidden">
      <PsychedelicBackground />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd() }} />

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
        <nav aria-label="Breadcrumb" className="text-xs text-white/60">
          <ol className="flex flex-wrap gap-1.5">
            <li>
              <Link href="/" className="hover:text-white">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-white">
              History
            </li>
          </ol>
        </nav>

        <div className="mt-8 text-center">
          <h1 className="text-psychedelic font-display mt-3 text-4xl tracking-wide uppercase sm:text-6xl lg:text-7xl">
            {/* Two blocks rather than one wrapping line, so the break
                lands after "Extraordinary" at every width instead of
                wherever the container happens to run out. */}
            <span className="block">The Extraordinary</span>
            <span className="block">History of WHOA</span>
          </h1>
          {/* The when / where / who in one paragraph, first on the page, so
              it's what a search engine lifts as the summary. The year and
              WASANI's name carry the markup they always did: a crawler
              answering "when was WHOA founded" reads this paragraph, not
              the timeline below it. */}
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            WHOA started with a rhythm and a thread, under the Southern California sun. In{" "}
            <strong className="text-white">2015</strong>,{" "}
            <Link href="/music-collective/wasani" className="text-flame font-semibold hover:underline">
              WASANI
            </Link>{" "}
            and Reece dropped the official WHOA song and pressed their very first t-shirt. What
            began as a handful of hand-dyed tees has since rippled through the entire world.
            Today, that spark has evolved into a canvas for one-of-a-kind, hand-painted apparel,
            legendary pop-ups, and collaborative art. From our flagship shop in Ocean Beach to
            massive festival activations, WHOA isn&apos;t just a brand anymore, it&apos;s a
            movement born from expression.
          </p>
        </div>

        {/* Jump-to-year strip. Sticky so it stays a scrubber on a long
            scroll; scrolls sideways on a phone instead of wrapping. */}
        <nav
          aria-label="Jump to year"
          className="sticky top-0 z-20 -mx-4 mt-12 overflow-x-auto border-y border-white/10 bg-background/80 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border"
        >
          <ol className="flex w-max gap-2 sm:mx-auto">
            {HISTORY.map((entry) => (
              <li key={entry.year}>
                <a
                  href={`#y${entry.year}`}
                  className="font-display block rounded-full border border-white/15 px-3 py-1 text-lg tracking-wide text-white/80 transition-colors hover:border-flame-2 hover:text-white"
                >
                  {entry.year}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* The road. One line down the left on a phone; down the middle on
            a wider screen, with the years alternating sides and tucked up
            against each other. The line sits outside the <ol> so it
            doesn't throw off the odd/even count that picks each side. */}
        <div className="relative mt-12">
          <span
            aria-hidden="true"
            className="history-road absolute top-0 bottom-0 left-[1.125rem] w-1 rounded-full md:left-1/2 md:-translate-x-1/2"
          />
          <ol className="relative">
            {HISTORY.map((entry, i) => (
              <li
                key={entry.year}
                id={`y${entry.year}`}
                className="history-reveal relative scroll-mt-24 pb-12 pl-14 last:pb-0 md:w-1/2 md:pl-0 md:odd:pr-12 md:even:ml-auto md:even:pl-12 md:not-first:-mt-24"
              >
                <span
                  aria-hidden="true"
                  className={`history-stop absolute top-1 left-0 grid h-10 w-10 place-items-center rounded-full ${
                    i % 2 === 0 ? "md:right-0 md:left-auto md:translate-x-1/2" : "md:-translate-x-1/2"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full bg-background" />
                </span>

                <div className="card-surface rounded-2xl p-5 shadow-lg shadow-black/40 sm:p-6">
                  {entry.place && (
                    <span className="float-right ml-3 flex items-center gap-1 pt-2 text-xs font-semibold tracking-wide text-white/60 uppercase">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
                      </svg>
                      {entry.place}
                    </span>
                  )}
                  {/* Year and title in one heading, so the outline reads
                      "2018: Making it official" for a crawler or screen reader. */}
                  <h2 className="font-display tracking-wide">
                    <span className="text-flame block text-5xl leading-none">
                      {entry.year}
                      <span className="sr-only">:</span>
                    </span>
                    <span className="mt-2 block text-xl text-foreground/90">{entry.title}</span>
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {entry.milestones.map((m) => (
                      <li key={m} className="flex gap-2 text-sm leading-relaxed text-muted">
                        <span aria-hidden="true" className="text-flame-2 mt-0.5">
                          ✦
                        </span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.link && (
                    <Link
                      href={entry.link.href}
                      className="text-flame mt-4 inline-block text-xs font-semibold tracking-wide uppercase hover:underline"
                    >
                      {entry.link.label} →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card-surface mx-auto mt-16 max-w-2xl rounded-2xl p-6 text-center sm:p-8">
          <h2 className="text-psychedelic font-display text-3xl tracking-wide">
            The next stop is yours
          </h2>
          <p className="mt-2 text-sm text-muted">
            Every piece someone wears, every artist who joins, every event someone shows up to is
            part of this story.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop"
              className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
            >
              Shop WHOA
            </Link>
            <Link
              href="/stores"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
            >
              Visit the shop
            </Link>
            <Link
              href="/about/story"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 uppercase transition-colors hover:border-flame-2/60 hover:text-white"
            >
              Our story
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
