import { EVENTS, sortEventsByProximity, type EventInfo } from "@/lib/events";

/**
 * Where you can buy WHOA in person.
 *
 * Three kinds of place, and the difference matters to a shopper standing
 * on a street deciding whether to walk there:
 *
 *   retail-store   a shop of ours, open regular hours
 *   retail-popup   our rack inside somebody else's shop
 *   event-popup    a stall at an event, there for a weekend
 *
 * The first two are written down here. The third is derived from the
 * events calendar, because a pop-up at an event IS that event: keeping a
 * second list of them by hand would mean a stall advertised here for a
 * festival that moved.
 */

export type StoreKind = "retail-store" | "retail-popup" | "event-popup";

export const STORE_KIND_LABELS: Record<StoreKind, string> = {
  "retail-store": "Retail store",
  "retail-popup": "Retail pop-up",
  "event-popup": "Event pop-up",
};

export interface StoreAddress {
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface StoreLocation {
  slug: string;
  name: string;
  kind: StoreKind;
  /** One line on what this place is and why you'd go. */
  blurb: string;
  /**
   * Omitted where we don't have the address written down yet. Nothing
   * that depends on an address renders without one: no map, no
   * directions link, and no postal address in the structured data.
   * A store locator that sends somebody to the wrong street is worse
   * than one that admits it doesn't know yet.
   */
  address?: StoreAddress;
  /** Free text, e.g. "Open daily 11am - 7pm". Omitted when unknown. */
  hours?: string;
  phone?: string;
  /** Where to read more on this site. */
  href?: string;
  /** The event this pop-up is part of, for the derived ones. */
  dateLabel?: string;
}

/** The address of the shop, as one line. */
export function formatAddress(address: StoreAddress): string {
  return `${address.street}, ${address.city}, ${address.region} ${address.postalCode}`;
}

/**
 * A link that opens the right map app with this place in it.
 *
 * Searched by address rather than by coordinates on purpose: we don't
 * hold a geocode for these, and a guessed latitude drops a pin in the
 * sea. Letting Google resolve the address it was given is both accurate
 * and self-maintaining.
 */
export function directionsUrl(address: StoreAddress): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(address))}`;
}

/** The same address, as an embeddable map. No API key: the plain embed
 *  endpoint takes a query string and geocodes it itself. */
export function mapEmbedUrl(address: StoreAddress): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(formatAddress(address))}&z=15&output=embed`;
}

/** The WHOADEGA's own address, which the events list already carries. */
export const WHOADEGA_STREET = "4847 Newport Ave";

export const PERMANENT_LOCATIONS: StoreLocation[] = [
  {
    slug: "whoadega",
    name: "The WHOADEGA",
    kind: "retail-store",
    blurb:
      "Our shop in Ocean Beach: hand-bleached and hand-painted one-of-a-kind pieces, work from the artists in the WHOA collective, and the events that run out of the back of it.",
    address: {
      street: WHOADEGA_STREET,
      city: "San Diego",
      region: "CA",
      postalCode: "92107",
      country: "US",
    },
    phone: "+1-619-630-9551",
    href: "/events",
  },
  {
    slug: "pangea",
    name: "Pangea",
    kind: "retail-popup",
    blurb: "A WHOA rack inside Pangea. Our pieces, their shop.",
    // No address here on purpose. Everything that needs one is skipped
    // until the real one is filled in, rather than guessed at.
  },
];

/**
 * Event pop-ups: upcoming events that are NOT at the WHOADEGA.
 *
 * Anything at Newport Ave is the shop itself rather than a pop-up, and
 * listing it twice would make one address look like two places to visit.
 */
export function eventPopUps(now: Date = new Date()): StoreLocation[] {
  const upcoming = sortEventsByProximity(
    EVENTS.filter((e) => {
      const end = e.endDate ?? e.startDate;
      if (!end) return false;
      // Compared as dates, not timestamps: an event is still on today
      // until today is over.
      return end >= toIsoDay(now);
    }),
    now,
  );

  return upcoming
    .filter((e) => !isAtTheShop(e))
    .map((event) => ({
      slug: `event-${event.id}`,
      name: event.venue,
      kind: "event-popup" as const,
      blurb: event.title,
      dateLabel: event.dateLabel,
      href: "/events",
      address: parseLocation(event.location),
    }));
}

function toIsoDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isAtTheShop(event: EventInfo): boolean {
  return event.location.includes(WHOADEGA_STREET);
}

/**
 * Turn an event's free-text location into an address, when it is one.
 *
 * The events list holds everything from "4847 Newport Ave, San Diego" to
 * "1 Hr East of San Diego, CA". Only something with a street number gets
 * an address, so the vaguer ones end up with no map and no directions
 * link rather than a pin dropped on a city centre.
 */
function parseLocation(location: string): StoreAddress | undefined {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return undefined;

  const [street, city, ...rest] = parts;
  if (!/^\d/.test(street)) return undefined;

  const tail = rest.join(" ");
  const postal = tail.match(/\b\d{5}\b/)?.[0] ?? "";
  const region = tail.match(/\b[A-Z]{2}\b/)?.[0] ?? "CA";

  return { street, city, region, postalCode: postal, country: "US" };
}

/** Everything, in the order the page lists it: the shop, then the
 *  pop-ups inside other shops, then whatever is on this month. */
export function allLocations(now: Date = new Date()): StoreLocation[] {
  return [...PERMANENT_LOCATIONS, ...eventPopUps(now)];
}
