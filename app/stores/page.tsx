import type { Metadata } from "next";

import StoreLocator from "@/components/stores/StoreLocator";
import { SITE_URL } from "@/lib/site";
import {
  allLocations,
  formatAddress,
  STORE_KIND_LABELS,
  type StoreLocation,
} from "@/lib/stores";

export const metadata: Metadata = {
  alternates: { canonical: "/stores" },
  title: "Retail Locations",
  description:
    "Where to buy WHOA in person: our Ocean Beach shop the WHOADEGA at 4847 Newport Ave, San Diego, plus retail pop-ups and event pop-ups around San Diego.",
  openGraph: {
    title: "WHOA Retail Locations",
    description:
      "Find WHOA in person. The WHOADEGA in Ocean Beach, retail pop-ups, and event pop-ups around San Diego.",
    url: `${SITE_URL}/stores`,
    type: "website",
  },
};

// An hour. The permanent shops never change, but the event pop-ups are
// derived from the events calendar, and a stall that finished yesterday
// shouldn't still be listed as somewhere to go.
export const revalidate = 3600;

/**
 * Where to find WHOA in person.
 *
 * Built SEO-first, which here means one specific thing: everything a
 * search engine needs is in the server-rendered HTML. The addresses, the
 * opening information, the structured data and every directions link are
 * all in the markup before a line of JavaScript runs. The map is an
 * embedded iframe and the only interactive part is choosing which place
 * it points at, so a crawler, a privacy browser that blocks third-party
 * frames, and a phone on a bad connection all still get the whole page.
 *
 * The structured data is the part that actually earns the local results.
 * One ItemList of Store entries, each with a real PostalAddress -- and
 * only for places whose address we actually hold, because a made-up
 * address in schema.org markup is worse than no markup at all.
 */
function buildJsonLd(locations: StoreLocation[]): string {
  const withAddresses = locations.filter((l) => l.address);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "WHOA retail locations",
    itemListElement: withAddresses.map((location, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Store",
        name: location.name,
        description: location.blurb,
        url: `${SITE_URL}/stores#${location.slug}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: location.address!.street,
          addressLocality: location.address!.city,
          addressRegion: location.address!.region,
          postalCode: location.address!.postalCode || undefined,
          addressCountry: location.address!.country,
        },
        ...(location.phone ? { telephone: location.phone } : {}),
        ...(location.hours ? { openingHours: location.hours } : {}),
        parentOrganization: { "@type": "Organization", name: "WHOA", url: SITE_URL },
      },
    })),
  };

  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default function StoresPage() {
  const locations = allLocations();
  const counts = locations.reduce<Record<string, number>>((acc, l) => {
    acc[l.kind] = (acc[l.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="mx-auto w-full max-w-5xl flex-1 px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildJsonLd(locations) }}
      />

      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Find us in person
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        Retail <span className="text-flame">Locations</span>
      </h1>

      {/* Written for a person, and it happens to be what a search engine
          reads as the summary: the shop, the city, the street. */}
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        WHOA is made and sold in San Diego. Our shop, the WHOADEGA, is at{" "}
        <strong className="text-foreground">{formatAddress(allLocations()[0].address!)}</strong>, in
        Ocean Beach. You&apos;ll also find our pieces on a rack inside other shops, and at a stall
        wherever we&apos;re running an event.
      </p>

      <p className="mt-3 text-sm text-muted">
        {Object.entries(counts)
          .map(([kind, count]) => `${count} ${STORE_KIND_LABELS[kind as keyof typeof STORE_KIND_LABELS].toLowerCase()}${count === 1 ? "" : "s"}`)
          .join(" · ")}
      </p>

      <StoreLocator locations={locations} />
    </section>
  );
}
