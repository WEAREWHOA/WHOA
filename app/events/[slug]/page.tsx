import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PsychedelicBackground from "@/components/home/PsychedelicBackground";
import { getAllEvents, getEventById } from "@/lib/eventsStore";
import { getCurrentPriceCents, isTicketingOpen } from "@/lib/events";
import { formatCents } from "@/lib/money";
import { SITE_URL } from "@/lib/site";

/**
 * One event, at its own address.
 *
 * The calendar opens a flyer card in place, which is the nicer way to
 * browse and is staying. What it never had was a URL: every event lived
 * at /events, so none of them could be linked to, shared, or found in a
 * search, and the moment one dropped off the front of the calendar it
 * was gone from the internet entirely.
 *
 * So this is the page underneath. Every event has one, including the
 * ones that have already happened -- a past show is the evidence that
 * the thing WHOA says it does is a thing WHOA actually does, and it is
 * what somebody searching the venue's name a month later finds.
 */

export const revalidate = 300;

/**
 * Prerendered for the events in the code, rendered on demand for
 * anything created in the portal after the last deploy. dynamicParams
 * is left at its default for exactly that.
 */
export async function generateStaticParams() {
  const events = await getAllEvents().catch(() => []);
  return events.map((event) => ({ slug: event.id }));
}

export async function generateMetadata(props: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventById(slug).catch(() => undefined);
  if (!event) return {};

  const where = [event.venue, event.location].filter(Boolean).join(", ");
  return {
    title: event.title,
    description:
      event.details?.[0] ??
      `${event.title} — ${event.dateLabel}${where ? ` at ${where}` : ""}.`,
    alternates: { canonical: `/events/${event.id}` },
  };
}

function isPast(event: { startDate: string; endDate?: string }): boolean {
  const last = event.endDate || event.startDate;
  // Compared as dates rather than instants: an event is over at the end
  // of its last day, not at midnight UTC in the middle of it.
  return last < new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params;
  const event = await getEventById(slug).catch(() => undefined);
  if (!event) notFound();

  const past = isPast(event);
  const priceCents = getCurrentPriceCents(event);
  const ticketingOpen = !past && isTicketingOpen(event);
  const [c1, c2, c3] = event.gradient;

  // Schema.org Event, which is what puts a date, a place and a ticket
  // link in a search result instead of a bare blue line. Past events
  // keep theirs: the markup describes what happened, and removing it
  // would not make the page rank, only make it say less.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: `${SITE_URL}/events/${event.id}`,
    ...(event.imageUrl
      ? { image: [event.imageUrl.startsWith("/") ? `${SITE_URL}${event.imageUrl}` : event.imageUrl] }
      : {}),
    ...(event.details?.length ? { description: event.details.join(" ") } : {}),
    location: {
      "@type": "Place",
      name: event.venue || "WHOA",
      ...(event.location ? { address: event.location } : {}),
    },
    organizer: { "@type": "Organization", name: "WHOA", url: SITE_URL },
    ...(event.lineup?.length
      ? { performer: event.lineup.map((act) => ({ "@type": "PerformingGroup", name: act })) }
      : {}),
    ...(ticketingOpen
      ? {
          offers: {
            "@type": "Offer",
            url: event.href || `${SITE_URL}/events?event=${event.id}`,
            price: (priceCents / 100).toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };

  return (
    <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-20">
      <PsychedelicBackground />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="relative z-10 w-full max-w-3xl">
        <Link href="/events" className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase hover:text-white">
          ← All events
        </Link>

        <div
          className="relative mt-5 overflow-hidden rounded-2xl border border-white/15"
          style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 55%, ${c3} 100%)` }}
        >
          {event.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />
            </>
          )}
          <div aria-hidden className="event-card-noise absolute inset-0" />
          <div className="relative p-8 sm:p-10">
            {past && (
              <span className="rounded-full bg-black/60 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.2em] text-white/80 uppercase">
                Past event
              </span>
            )}
            <p className="mt-3 text-xs font-semibold tracking-[0.2em] text-white/80 uppercase">
              {event.venue}
            </p>
            <h1 className="font-display mt-2 text-4xl tracking-wide text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] sm:text-5xl">
              {event.title}
            </h1>
            <p className="mt-3 text-sm font-semibold text-white/90">
              {event.dateLabel} · {event.timeLabel}
            </p>
          </div>
        </div>

        <div className="card-surface mt-6 rounded-2xl border border-border p-6 sm:p-8">
          {event.lineup && event.lineup.length > 0 && (
            <ul className="space-y-0.5">
              {event.lineup.map((act) => (
                <li key={act} className="font-display text-2xl leading-tight">
                  {act}
                </li>
              ))}
            </ul>
          )}

          {event.details && event.details.length > 0 && (
            <ul className="mt-5 space-y-1.5">
              {event.details.map((line) => (
                <li key={line} className="text-sm leading-snug text-muted">
                  {line}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-5 text-sm font-semibold">{event.venue}</p>
          {event.location && <p className="text-sm text-muted">{event.location}</p>}

          {event.tags && event.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="border-border-strong rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-muted uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* RSVP and ticketing live in the calendar's own modal, which
              is where the checkout, the waiver and the capacity check
              already are. Rebuilding them here would be a second copy of
              the one flow that takes money. */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {past ? (
              <p className="text-sm text-muted">
                This one has been and gone.{" "}
                <Link href="/events" className="text-flame hover:underline">
                  See what&apos;s coming up
                </Link>
                .
              </p>
            ) : event.href ? (
              <a
                href={event.href}
                target="_blank"
                rel="noreferrer"
                className="btn-flame rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] uppercase"
              >
                Tickets
              </a>
            ) : (
              <Link
                href={`/events?event=${encodeURIComponent(event.id)}`}
                className="btn-flame rounded-full px-6 py-3 text-xs font-bold tracking-[0.12em] uppercase"
              >
                {priceCents > 0 ? `Buy Ticket ${formatCents(priceCents)}` : "Free RSVP"}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
