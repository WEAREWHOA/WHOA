"use client";

import Link from "next/link";
import { useState } from "react";

import StoreKindIcon from "@/components/stores/StoreKindIcon";
import {
  directionsUrl,
  formatAddress,
  mapEmbedUrl,
  STORE_KIND_LABELS,
  type StoreLocation,
} from "@/lib/stores";

/**
 * The map on top, the list below, as two ways of reading the same thing.
 *
 * The only state here is which location the map points at. Everything
 * else -- names, addresses, directions links, the whole list -- is
 * server-rendered markup this component receives and prints, so the page
 * is complete and indexable before any of this runs. Picking a different
 * pin is the enhancement; it is not how you read the page.
 *
 * The map starts on the first location that actually has an address,
 * which also means the iframe's src is in the initial HTML rather than
 * appearing after hydration.
 */
export default function StoreLocator({ locations }: { locations: StoreLocation[] }) {
  const mappable = locations.filter((l) => l.address);
  const [activeSlug, setActiveSlug] = useState(mappable[0]?.slug ?? null);
  const active = mappable.find((l) => l.slug === activeSlug) ?? mappable[0];

  return (
    <>
      {active?.address && (
        <section className="mt-10" aria-label="Map of WHOA locations">
          {/* The map is a third-party frame, which is the one thing on
              this page a privacy browser, an ad blocker or a flaky
              connection can take away. There's no styling a cross-origin
              frame's own error page, so rather than hide a fallback
              behind it and hope, the link out sits permanently under the
              map where it's useful either way. */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            <iframe
              // Keyed on the slug so React swaps the frame rather than
              // mutating its src, which some browsers treat as a history
              // entry and turn the back button into a tour of the map.
              key={active.slug}
              title={`Map showing ${active.name}`}
              src={mapEmbedUrl(active.address)}
              // Lazy because it's a third-party frame on a page whose
              // real content is the list below it.
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-[320px] w-full border-0 sm:h-[420px]"
            />
          </div>

          <p className="mt-3 text-sm text-muted">
            Showing <span className="text-foreground">{active.name}</span>,{" "}
            {formatAddress(active.address)}.{" "}
            <a
              href={directionsUrl(active.address)}
              target="_blank"
              rel="noreferrer"
              className="text-flame font-medium hover:underline"
            >
              Open in Maps
            </a>
            .
          </p>

          {mappable.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {mappable.map((l) => (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => setActiveSlug(l.slug)}
                  aria-pressed={l.slug === active.slug}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold tracking-wide uppercase transition-colors ${
                    l.slug === active.slug
                      ? "border-flame-2 bg-flame-2/15 text-flame-3"
                      : "border-border-strong text-muted hover:border-flame-2/50 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <StoreKindIcon kind={l.kind} className="h-3.5 w-3.5" />
                    {l.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <h2 className="font-display mt-14 text-2xl tracking-wide">All locations</h2>

      <ul className="mt-6 flex flex-col gap-4">
        {locations.map((location) => (
          <li
            key={location.slug}
            id={location.slug}
            className="card-surface rounded-2xl border border-border p-6 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="text-flame-2 flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.15em]">
                  <StoreKindIcon kind={location.kind} className="h-4 w-4 shrink-0" />
                  {STORE_KIND_LABELS[location.kind]}
                </span>
                <h3 className="font-display mt-1 text-2xl">{location.name}</h3>
              </div>
              {location.dateLabel && (
                <span className="rounded-full border border-border-strong px-3 py-1 text-xs text-muted">
                  {location.dateLabel}
                </span>
              )}
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{location.blurb}</p>

            {location.address ? (
              // A real <address>, so the street is marked up as one for
              // anything reading the page rather than looking at it.
              <address className="mt-4 text-sm not-italic text-foreground/90">
                {location.insideOf && (
                  <span className="block text-muted">Inside {location.insideOf}</span>
                )}
                {formatAddress(location.address)}
              </address>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Address coming soon.{" "}
                <Link href="/contact" className="text-flame font-medium hover:underline">
                  Ask us where to find it
                </Link>
                .
              </p>
            )}

            {location.hours && <p className="mt-1 text-sm text-muted">{location.hours}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
              {location.address && (
                <>
                  <a
                    href={directionsUrl(location.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-flame rounded-full px-5 py-2.5 text-xs font-bold tracking-wide uppercase"
                  >
                    Directions
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveSlug(location.slug)}
                    className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-muted transition-colors hover:border-flame-2/50 hover:text-foreground"
                  >
                    Show on map
                  </button>
                </>
              )}
              {location.website && (
                <a
                  href={location.website}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-muted transition-colors hover:border-flame-2/50 hover:text-foreground"
                >
                  Visit website
                </a>
              )}
              {location.phone && (
                <a
                  href={`tel:${location.phone}`}
                  className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-muted transition-colors hover:border-flame-2/50 hover:text-foreground"
                >
                  Call
                </a>
              )}
              {location.href && (
                <Link
                  href={location.href}
                  className="rounded-full border border-border-strong px-5 py-2.5 text-xs font-semibold tracking-wide uppercase text-muted transition-colors hover:border-flame-2/50 hover:text-foreground"
                >
                  {location.kind === "event-popup" ? "Event details" : "Upcoming events"}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted">
        Can&apos;t get to San Diego?{" "}
        <Link href="/shop" className="text-flame font-medium hover:underline">
          Shop online
        </Link>
        . We ship worldwide.
      </p>
    </>
  );
}
