import type { Metadata } from "next";
import Link from "next/link";

import EventTile from "@/components/whoadega/EventTile";
import ProductCard from "@/components/shop/ProductCard";
import { listProducts } from "@/lib/catalog";
import { getNextWhoaWednesday } from "@/lib/whoaWednesday";
import { shopEvents, whoadega } from "@/lib/whoadega";
import { directionsUrl, formatAddress, googleMapsUrl, mapEmbedUrl } from "@/lib/stores";
import { SITE_URL } from "@/lib/site";
import type { Product } from "@/lib/types";

const TITLE = "The WHOADEGA";
const DESCRIPTION =
  "WHOA's shop in Ocean Beach, San Diego, at 4847 Newport Ave. Part shop, part gallery, part " +
  "event space: one-of-a-kind hand-bleached and hand-painted pieces, work from the WHOA " +
  "collective, art shows in SH!FT Gallery, and WHOA Wednesday every week.";

export const metadata: Metadata = {
  alternates: { canonical: "/whoadega" },
  title: TITLE,
  description: DESCRIPTION,
  // No openGraph block. Declaring one here without images is what left
  // /stores and /oneofakindheadwear sharing with no picture: the title
  // and description above fill og and twitter by themselves.
};

/**
 * An hour, and the reason matters more than the number.
 *
 * Everything on this page that moves (what is on, what is in the shop,
 * which Wednesday is next) comes from live data. Without this the page
 * is prerendered once at build and becomes a photograph of build day:
 * the calendar frozen, the Wednesday stuck on a night that has been and
 * gone. That exact bug has already been fixed twice on this site.
 */
export const revalidate = 3600;

/**
 * The shop's own page, and the one that should own the word.
 *
 * ───────────────────────────────────────────────────────────────────────
 * /stores already lists the WHOADEGA, but it is a locator: an ItemList
 * of three kinds of place, written to answer "where can I buy this". It
 * cannot also be the page that answers "what IS the WHOADEGA", because
 * a page that tries to be both ranks for neither and tells a visitor
 * about Pacific Beach when they asked about Ocean Beach.
 *
 * So this is a Store entity rather than a list, with the address, the
 * phone number and the events in its markup. /stores keeps the
 * comparison job and links here; this keeps the name.
 * ───────────────────────────────────────────────────────────────────────
 */
function buildJsonLd(hasEvents: boolean): string {
  const shop = whoadega();
  const address = shop.address!;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `${SITE_URL}/whoadega`,
    name: "The WHOADEGA",
    alternateName: ["WHOADEGA", "WHOA Ocean Beach"],
    description: DESCRIPTION,
    url: `${SITE_URL}/whoadega`,
    telephone: shop.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: address.country,
    },
    parentOrganization: { "@type": "Organization", name: "WHOA", url: SITE_URL },
    // The Google listing, named as this place's map. Still no
    // openingHours: we do not hold them, Google does, and asserting a
    // guess here is how a search result tells somebody we are open on
    // a day we are shut. This points at the source instead of
    // competing with it.
    hasMap: googleMapsUrl("The WHOADEGA", address),
    // Claimed only when there are events to point at. A venue in the
    // markup with nothing on is a claim a crawler can check and find
    // empty, which is worse than not making it.
    ...(hasEvents ? { subjectOf: { "@type": "WebPage", url: `${SITE_URL}/events` } } : {}),

  };

  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

/** Three things under one roof, which is the whole pitch. */
const WHAT_IT_IS = [
  {
    eyebrow: "The shop",
    title: "One of one, off the rack",
    body:
      "Hand-bleached and hand-painted pieces, finished in the back of this building. There is " +
      "one of each. Everything on the website is here, plus the things that never make it to " +
      "the website because they sell on the floor first.",
    href: "/shop",
    cta: "See what is in",
  },
  {
    eyebrow: "SH!FT Gallery",
    title: "Walls that change",
    body:
      "The gallery half. Art shows hung by artists from the WHOA collective and from around " +
      "San Diego, swapped out through the year. Free to walk in and look.",
    href: "/art-collective",
    cta: "Meet the artists",
  },
  {
    eyebrow: "The event space",
    title: "Open late, most weeks",
    body:
      "DJ sets, open decks, art nights and whatever else fits through the door. WHOA Wednesday " +
      "runs weekly, free entry, all ages. The room is the reason the shop stays open past " +
      "shop hours.",
    href: "/events",
    cta: "See what is on",
  },
];

export default async function WhoadegaPage() {
  const shop = whoadega();
  const address = shop.address!;

  // Three live reads, none of which is allowed to take the page down
  // with it. A visitor standing on Newport Ave wanting the phone number
  // should get the phone number even when Square is having a morning.
  const [events, nextWednesday, products] = await Promise.all([
    shopEvents().catch((err) => {
      console.error("Couldn't load WHOADEGA events:", err);
      return { upcoming: [], past: [] };
    }),
    getNextWhoaWednesday().catch((err) => {
      console.error("Couldn't find the next WHOA Wednesday:", err);
      return undefined;
    }),
    listProducts({ onlineOnly: true }).catch((err) => {
      console.error("Couldn't load products for /whoadega:", err);
      return [] as Product[];
    }),
  ]);

  const showingArePast = events.upcoming.length === 0 && events.past.length > 0;
  const showing = events.upcoming.length > 0 ? events.upcoming : events.past;
  const inTheShop = products.slice(0, 6);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: buildJsonLd(events.upcoming.length > 0 || events.past.length > 0),
        }}
      />

      {/* ───── The front door ───── */}
      <section className="relative flex flex-col items-center overflow-hidden px-6 py-24 text-center">
        {/* The hero's own background, not the site's PsychedelicBackground,
            which is `fixed inset-0`: right for a page that is one screen,
            wrong here, where it would sit behind the product cards and
            the map for the whole scroll. Absolute inside an
            overflow-hidden section stops where the section does. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(90% 70% at 50% 0%, rgba(255,122,0,0.28) 0%, rgba(255,47,176,0.14) 38%, rgba(1,0,10,0) 72%)," +
              "radial-gradient(70% 60% at 15% 100%, rgba(123,47,247,0.22) 0%, rgba(1,0,10,0) 70%)," +
              "radial-gradient(70% 60% at 90% 90%, rgba(41,230,255,0.14) 0%, rgba(1,0,10,0) 70%)," +
              "#01000a",
          }}
        />

        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
            Ocean Beach, San Diego
          </span>
          <h1 className="text-psychedelic font-display mt-3 text-5xl tracking-wide uppercase sm:text-7xl">
            The WHOADEGA
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/80">
            Part shop, part gallery, part event space. It is where the bleaching and the painting
            actually happen, where the collective hangs its work, and where the music runs late on
            a Wednesday.
          </p>
          <p className="mt-4 text-sm text-white/60">
            <a
              href={directionsUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-flame-2 underline decoration-white/30 underline-offset-4"
            >
              {formatAddress(address)}
            </a>
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={directionsUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
            >
              Get directions
            </a>
            <Link
              href="#whats-on"
              className="hover:border-flame-2/60 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 uppercase transition-colors hover:text-white"
            >
              What is on
            </Link>
          </div>
        </div>
      </section>

      {/* ───── What the place actually is ───── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          Three things, one room
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          What the <span className="text-flame">WHOADEGA</span> is
        </h2>

        <div className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-3">
          {WHAT_IT_IS.map((card) => (
            <Link
              key={card.eyebrow}
              href={card.href}
              className="card-surface group hover:border-flame-2/50 flex flex-col rounded-2xl border border-border p-6 transition-colors"
            >
              <span className="text-flame-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
                {card.eyebrow}
              </span>
              <h3 className="font-display mt-2 text-xl leading-tight">{card.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{card.body}</p>
              <span className="text-flame mt-4 text-sm font-semibold group-hover:underline">
                {card.cta} &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── The weekly one ─────
          Given its own band rather than being one tile among many. It
          is the only thing here that happens every week, which makes it
          the answer to "is there any reason to go on a random
          Wednesday", and that is a different question from "what is on
          this month". */}
      <section className="bg-surface-raised/40 border-y border-border px-6 py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-start gap-8 sm:flex-row sm:items-center">
          <div className="flex-1">
            <span className="text-flame-2 text-xs font-semibold tracking-[0.2em] uppercase">
              Every week
            </span>
            <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">WHOA Wednesday</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Doors at 7, music until 11. Free entry, all ages. Resident and guest DJs, open
              decks, and whoever the room brings in. It has run out of the back of this shop since
              before the shop was the shop.
            </p>
            {nextWednesday && (
              <p className="mt-4 text-sm">
                <span className="text-muted">Next one: </span>
                <span className="font-semibold">
                  {nextWednesday.dateLabel}
                  {nextWednesday.timeLabel ? `, ${nextWednesday.timeLabel}` : ""}
                </span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            {/* The permalink, not this week's page. It is the thing to
                put on a flyer, and it still works next month. */}
            <Link
              href="/whoa-wednesday"
              className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
            >
              Next Wednesday
            </Link>
            <Link
              href="/events"
              className="border-border-strong hover:border-flame-2/60 rounded-full border px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors"
            >
              Full calendar
            </Link>
          </div>
        </div>
      </section>

      {/* ───── What is on ───── */}
      <section id="whats-on" className="mx-auto w-full max-w-5xl scroll-mt-20 px-6 py-16">
        <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
          {showingArePast ? "Recently at the shop" : "On at the shop"}
        </span>
        <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
          {showingArePast ? "What it has been" : "What is on"}
        </h2>

        {showing.length === 0 ? (
          <p className="an-empty">
            Nothing on the calendar at the moment.{" "}
            <Link href="/newsletter" className="text-flame hover:underline">
              Get the drops first
            </Link>{" "}
            and we will tell you when the next one lands.
          </p>
        ) : (
          <>
            {showingArePast && (
              // Said out loud rather than left to be worked out from the
              // dates. A grid of flyers with no label reads as "what's
              // on", and sending somebody to a night that happened in
              // March is worse than admitting the calendar is empty.
              <p className="mt-3 max-w-2xl text-sm text-muted">
                Nothing is on the books right now. Here is what the room has been doing.
              </p>
            )}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
              {showing.map((event) => (
                <EventTile key={event.id} event={event} past={showingArePast} />
              ))}
            </div>
            <div className="mt-8">
              <Link href="/events" className="text-flame text-sm font-semibold hover:underline">
                See the whole calendar &rarr;
              </Link>
            </div>
          </>
        )}
      </section>

      {/* ───── What is on the rack ───── */}
      {inTheShop.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
            On the rack
          </span>
          <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">
            In the shop <span className="text-flame">right now</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            A few of the pieces on the floor. Order online and choose pickup to collect it here
            for free, or come in and find the ones that never made it to the website.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-3">
            {inTheShop.map((product, i) => (
              <ProductCard key={product.id} product={product} delay={i * 0.08} />
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/shop"
              className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
            >
              Shop everything
            </Link>
          </div>
        </section>
      )}

      {/* ───── Getting here ───── */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto grid w-full max-w-5xl gap-10 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              Come in
            </span>
            <h2 className="font-display mt-2 text-3xl tracking-wide sm:text-4xl">Find us</h2>

            <address className="mt-6 text-base leading-relaxed not-italic">
              <strong className="font-semibold">The WHOADEGA</strong>
              <br />
              {address.street}
              <br />
              {address.city}, {address.region} {address.postalCode}
            </address>

            {/* ───── Hours ─────
                Sent to Google rather than printed here, and that is the
                right answer rather than a dodge. Hours move for
                holidays, for an event running late, for a quiet
                Tuesday, and Google is the one place that gets updated
                when they do. A second copy on this page would be a
                second thing to remember, and the one that is wrong is
                always the copy nobody thought about. Wrong hours are
                worse than no hours: they send somebody across town to
                a locked door. */}
            <p className="mt-5 text-sm leading-relaxed">
              <strong className="font-semibold">Today&apos;s hours</strong> are on{" "}
              <a
                href={googleMapsUrl("The WHOADEGA", address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-flame hover:underline"
              >
                our Google listing
              </a>
              , which is always the live one. Holidays and event nights move them, and that is
              where we keep them current.
            </p>

            {shop.phone && (
              <p className="mt-3 text-sm">
                <span className="text-muted">Or call: </span>
                <a href={`tel:${shop.phone}`} className="text-flame hover:underline">
                  {shop.phone.replace("+1-", "")}
                </a>
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={directionsUrl(address)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-flame rounded-full px-6 py-3 text-sm font-semibold tracking-wide uppercase"
              >
                Directions
              </a>
              <a
                href={googleMapsUrl("The WHOADEGA", address)}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border-strong hover:border-flame-2/60 rounded-full border px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors"
              >
                Hours on Google
              </a>
              <Link
                href="/stores"
                className="border-border-strong hover:border-flame-2/60 rounded-full border px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors"
              >
                Other locations
              </Link>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-muted">
              Buying online? Choose <strong className="text-foreground">pick up</strong> at
              checkout and collect it here for free.
            </p>
          </div>

          {/* Lazy, and the only third-party frame on the page. A visitor
              who blocks it still has the address, the phone number and a
              directions link above, all in the markup. */}
          <iframe
            src={mapEmbedUrl(address)}
            title="Map to the WHOADEGA on Newport Ave, Ocean Beach"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-72 w-full rounded-2xl border border-border sm:h-full sm:min-h-[20rem]"
          />
        </div>
      </section>
    </>
  );
}
