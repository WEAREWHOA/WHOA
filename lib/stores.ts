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

/**
 * Said in caps because that's the name of the thing, not shouting: these
 * are the three badges on the cards and the three icons in the legend.
 * Held as caps here rather than left to CSS so the plain text that goes
 * out in the page summary reads the same as the badge above it.
 */
export const STORE_KIND_LABELS: Record<StoreKind, string> = {
  "retail-store": "RETAIL STORE",
  "retail-popup": "RETAIL POP-UP",
  "event-popup": "EVENT POP-UP",
};

/** The same three, for "2 EVENT POP-UPS". */
export const STORE_KIND_LABELS_PLURAL: Record<StoreKind, string> = {
  "retail-store": "RETAIL STORES",
  "retail-popup": "RETAIL POP-UPS",
  "event-popup": "EVENT POP-UPS",
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
  /**
   * The business whose building this is, for a pop-up that lives inside
   * another shop. Published as containedInPlace in the structured data,
   * which is what stops a search engine reading two businesses at one
   * street address as a conflict about who is really there.
   */
  insideOf?: string;
  /**
   * That host business's own site. A followed link, not nofollow: it is
   * a real shop we are really inside, and the markup already names them
   * as the place that contains us, so the link and the structured data
   * tell a search engine the same true thing.
   */
  website?: string;
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
    // Kept as "pangea" so the /stores#pangea link stays good.
    slug: "pangea",
    name: "Pangaea Outpost",
    kind: "retail-popup",
    blurb:
      "Our own section inside Pangaea Outpost, the indoor marketplace on Garnet Ave in Pacific Beach. A proper corner of WHOA in among the other local makers, open whenever the marketplace is.",
    address: {
      street: "909 Garnet Ave",
      city: "San Diego",
      region: "CA",
      postalCode: "92109",
      country: "US",
    },
    insideOf: "Pangaea Outpost",
    website: "https://www.pangaeaoutpost.com/",
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
