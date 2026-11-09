import type { Metadata } from "next";

import SubmitForm from "@/components/whoaMap/SubmitForm";
import WorldMap from "@/components/whoaMap/WorldMap";
import {
  approvedPins,
  mapTotals,
  topTaggers,
  PIN_KIND_LABELS,
  placeLabel,
  type MapPin,
  type MapTotals,
  type Tagger,
} from "@/lib/whoaMap";
import { SITE_URL } from "@/lib/site";

const TITLE = "WHOA Map";
const DESCRIPTION =
  "Every WHOA sticker and piece spotted around the world, sent in by the people who found them. " +
  "See one? Put it on the map.";

export const metadata: Metadata = {
  alternates: { canonical: "/whoa-map" },
  title: TITLE,
  description: DESCRIPTION,
};

/**
 * Hourly. The map is approved submissions, which arrive at human speed
 * and are reviewed at human speed, so a page rebuilt once an hour is
 * never meaningfully behind. Without it the page would be a photograph
 * of build day and would never gain a pin again.
 */
export const revalidate = 3600;

const ERRORS: Record<string, string> = {
  human: "That didn't go through. Give it another go.",
  photo: "Pick a photo of it first.",
  server: "Something went wrong at our end. Try again in a minute.",
};

export default async function WhoaMapPage(props: PageProps<"/whoa-map">) {
  const params = await props.searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const sent = first("sent") === "1";
  const error = first("error");

  // The map is the page, but the form underneath it has to work even
  // when the map cannot be drawn. A database that will not answer
  // should not take away somebody's ability to send one in.
  let pins: MapPin[] = [];
  let failed = false;
  try {
    pins = await approvedPins();
  } catch (err) {
    console.error("Couldn't load the WHOA map:", err);
    failed = true;
  }

  // Counted in the database, not off the array above, because that
  // array stops at 500 pins. Each is allowed to fail on its own: a
  // leaderboard that will not load should not take the map with it.
  const [totals, leaders] = await Promise.all([
    mapTotals().catch((err): MapTotals | null => {
      console.error("Couldn't count the WHOA map:", err);
      return null;
    }),
    topTaggers(10).catch((err): Tagger[] => {
      console.error("Couldn't read the WHOA map leaderboard:", err);
      return [];
    }),
  ]);

  const stickers = pins.filter((p) => p.kind === "sticker").length;
  const apparel = pins.length - stickers;
  const countries = new Set(pins.map((p) => p.country.toLowerCase())).size;

  return (
    <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        Spotted in the wild
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        WHOA <span className="text-flame">Map</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        Every sticker on a lamppost and every piece worn out in the world, sent in by whoever found
        it. If you spot one, put it on the map.
      </p>

      {/* THE TWO NUMBERS. Above the map, big, because they are the
          answer to "is this thing going anywhere" and that is the
          first question anybody has about a map of pins. Pins and
          cities rather than pins alone: five stickers in Lisbon is
          a good day for Lisbon, not five places. */}
      {totals && totals.pins > 0 && (
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
              Pins posted
            </dt>
            <dd className="font-display mt-1 text-4xl sm:text-5xl">
              {totals.pins.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.18em] text-muted uppercase">
              {totals.cities === 1 ? "City" : "Cities"}
            </dt>
            <dd className="font-display text-flame mt-1 text-4xl sm:text-5xl">
              {totals.cities.toLocaleString()}
            </dd>
          </div>
        </dl>
      )}

      {pins.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: "#29e6ff" }} />
            <span className="text-muted">
              {stickers.toLocaleString()} {stickers === 1 ? "sticker" : "stickers"}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: "#ff7a00" }} />
            <span className="text-muted">{apparel.toLocaleString()} apparel</span>
          </li>
          <li className="text-muted">
            {countries.toLocaleString()} {countries === 1 ? "country" : "countries"}
          </li>
        </ul>
      )}

      {/* The map is drawn even with nothing on it, and that is the
          fix for the first thing anybody said about this page: an
          empty state that REPLACED the map made the page look broken
          rather than new. An empty map is obviously a map. */}
      <div className="mt-8">
        {failed ? (
          <p className="an-empty">
            The map is having a moment. The form below still works, so send yours in anyway.
          </p>
        ) : (
          <>
            <WorldMap pins={pins} />
            {pins.length === 0 && (
              <p className="mt-4 text-center text-sm text-muted">
                No pins on it yet. Send the first one in below and it lands here once we have
                looked at it.
              </p>
            )}
          </>
        )}
      </div>

      {/* ───── Who has put the most on it ───── */}
      {leaders.length > 0 && (
        <div className="mt-14 max-w-2xl">
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Most pins</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Whoever has put the most on the map. Counted off the name on each submission, so sign
            them the same way and they all count together.
          </p>

          <ol className="mt-5 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
            {leaders.map((tagger, i) => (
              <li key={`${tagger.name}-${i}`} className="flex items-center gap-4 px-4 py-3">
                {/* The top three are worth looking different. Below
                    that a number is plenty. */}
                <span
                  className={`font-display w-7 shrink-0 text-center text-lg ${
                    i === 0
                      ? "text-flame-3"
                      : i === 1
                        ? "text-flame-2"
                        : i === 2
                          ? "text-flame-1"
                          : "text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{tagger.name}</span>
                <span className="shrink-0 text-sm text-muted">
                  {tagger.pins.toLocaleString()} {tagger.pins === 1 ? "pin" : "pins"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ───── Sending one in ───── */}
      <div id="send" className="mt-14 max-w-3xl scroll-mt-20">
        <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Put yours on the map</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Where you saw it, who you are, and a photo. That is the whole thing.
        </p>

        {sent && (
          // Says where it went, not just that it went. The first
          // person to use this submitted successfully and then looked
          // at an empty map, which reads exactly like a failure.
          <p className="border-flame-2/40 bg-flame-2/10 text-flame-3 mt-5 rounded-lg border px-4 py-3 text-sm leading-relaxed">
            <strong className="font-semibold">Got it.</strong> It is waiting to be looked at, so it
            is not on the map yet. Everything sent in is reviewed before it goes up, which is why
            the map is not instant.
          </p>
        )}
        {error && (
          <p className="border-flame-1/40 bg-flame-1/10 text-flame-3 mt-5 rounded-lg border px-4 py-3 text-sm">
            {/* A known code gets its sentence; anything else came from
                the validator and is already a sentence meant for the
                person who typed it. */}
            {ERRORS[error] ?? error}
          </p>
        )}

        <SubmitForm />
      </div>

      {/* ───── The same pins, as text ─────
          The map needs JavaScript and a tile server. This does not, so
          a crawler, a screen reader and a blocked third-party frame all
          still get the thing the page is about. */}
      {pins.length > 0 && (
        <div className="mt-16">
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">Latest finds</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pins.slice(0, 12).map((pin) => (
              <li key={pin.id} className="overflow-hidden rounded-xl border border-border">
                {/* Plain img: these are arbitrary user photos on a
                    public bucket, and routing them through the image
                    optimiser makes every submission a transform we pay
                    for. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pin.photoUrl}
                  alt={`${PIN_KIND_LABELS[pin.kind]} spotted in ${placeLabel(pin)}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="p-3">
                  <p
                    className="text-[11px] font-semibold tracking-[0.14em] uppercase"
                    style={{ color: pin.kind === "sticker" ? "#29e6ff" : "#ff7a00" }}
                  >
                    {PIN_KIND_LABELS[pin.kind]}
                  </p>
                  <p className="mt-0.5 truncate text-sm">{placeLabel(pin)}</p>
                  <p className="truncate text-xs text-muted">{pin.uploadedBy}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/whoa-map`,
            isPartOf: { "@type": "WebSite", name: "WHOA", url: SITE_URL },
          }).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
