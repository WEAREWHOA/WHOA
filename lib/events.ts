export type EventCategory = "whoadega" | "shows" | "festivals";

export const EVENT_CATEGORIES: { id: EventCategory; label: string }[] = [
  { id: "whoadega", label: "WHOAdega" },
  { id: "shows", label: "Shows" },
  { id: "festivals", label: "Festivals" },
];

export interface EventInfo {
  id: string;
  title: string;
  dateLabel: string;
  timeLabel: string;
  venue: string;
  location: string;
  category: EventCategory;
  // ISO yyyy-mm-dd. startDate/endDate power the calendar view; dateLabel is
  // still what's shown on the flyer card.
  startDate: string;
  endDate?: string;
  lineup?: string[];
  details?: string[];
  tags?: string[];
  accent: string;
  gradient: [string, string, string];
  // Present only for events with their own external ticketing (e.g. a
  // festival WHOA just has a presence at) — those keep linking out rather
  // than being sold through this app's checkout. Never set alongside
  // priceCents.
  href?: string;
  rotate: number;
  // In cents. Omitted or 0 means a free RSVP; set means "Buy Ticket"
  // charges this amount through the same in-app Square checkout as the
  // shop. Never set alongside href. When earlyBirdPriceCents is also set,
  // this is the day-of/door price instead of the only price — see below.
  priceCents?: number;
  // Optional discounted price (cents) in effect any day before startDate;
  // priceCents becomes the door price starting the day of the event itself.
  // Use getCurrentPriceCents(event) rather than reading priceCents directly
  // wherever a ticket price is shown or charged.
  earlyBirdPriceCents?: number;
}

// The price a ticket actually costs right now — priceCents, discounted to
// earlyBirdPriceCents (when set) for any purchase before the event's own
// startDate. Computed server-side at charge time in app/events/actions.ts,
// never trusted from the client.
export function getCurrentPriceCents(event: EventInfo, referenceDate: Date = new Date()): number {
  const todayKey = referenceDate.toISOString().slice(0, 10);
  if (event.earlyBirdPriceCents !== undefined && todayKey < event.startDate) {
    return event.earlyBirdPriceCents;
  }
  return event.priceCents ?? 0;
}

export const EVENTS: EventInfo[] = [
  {
    id: "whoa-wed-jul15",
    title: "WHOA Wednesday",
    dateLabel: "July 15",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-07-15",
    details: ["Special guest DJs"],
    tags: ["Free Entry", "All Ages"],
    accent: "#29e6ff",
    gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"],
    rotate: -2,
  },
  {
    id: "whoa-wed-jul22",
    title: "WHOA Wednesday",
    dateLabel: "July 22",
    timeLabel: "7PM – Midnight",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-07-22",
    lineup: ["Hunthux", "Blue Jade", "Anzio", "Kayristin", "+ Special Guest"],
    accent: "#ff2fb0",
    gradient: ["#0a0116", "#3a0a3a", "#ff2fb0"],
    rotate: 3,
  },
  {
    id: "whoa-wed-jul29",
    title: "WHOA Wednesday",
    dateLabel: "July 29",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-07-29",
    details: ["Hosted by Wasani featuring Divina"],
    tags: ["Free Entry", "All Ages"],
    accent: "#ff7a00",
    gradient: ["#2a0a3a", "#7b2ff7", "#ff7a00"],
    rotate: -4,
  },
  {
    id: "creation-station-aug5",
    title: "Creation Station",
    dateLabel: "August 5",
    timeLabel: "7PM – 11:30PM",
    venue: "SH!FT Gallery Takeover",
    location: "4847 Newport Ave, San Diego, CA 92107",
    category: "shows",
    startDate: "2026-08-05",
    details: ["Opening Night Celebration", "HABITAAT music video premiere"],
    lineup: ["Wasani Whoa", "Mad Maxime", "Just George", "Ivy Nyx"],
    accent: "#fff229",
    gradient: ["#c97a2f", "#e0a94e", "#fff229"],
    rotate: 4,
  },
  {
    id: "bayfest-2026",
    title: "Mission Bayfest 2026",
    dateLabel: "Oct 16 – 18",
    timeLabel: "3 Days",
    venue: "Pop Up Shop",
    location: "3119 Mariners Way, San Diego, CA",
    category: "festivals",
    startDate: "2026-10-16",
    endDate: "2026-10-18",
    lineup: ["Rebelution", "Kolohe Kai", "The Offspring", "+ 30 more"],
    details: [
      "Fri — Rebelution, Steel Pulse, The Movement + more",
      "Sat — Kolohe Kai, Common Kings, SOJA + more",
      "Sun — The Offspring, The Interrupters, Goldfinger + more",
    ],
    accent: "#ffb800",
    gradient: ["#1a3a5c", "#c9522f", "#ffb800"],
    href: "https://bayfestsd.com",
    rotate: -3,
  },
  {
    id: "ssbd-2026",
    title: "Same Same But Different",
    dateLabel: "Sept 25 – 27, 2026",
    timeLabel: "WHOADEGA Art Gallery Experience",
    venue: "Lake Perris, CA",
    location: "Lake Perris, CA",
    category: "festivals",
    startDate: "2026-09-25",
    endDate: "2026-09-27",
    lineup: ["LSDREAM", "Of The Trees", "Tape B", "+ Gramatik"],
    details: [
      "75+ workshops · 40+ art installations",
      "Floatopia beach party × 3 days",
      "Games, experiences & late-night hidden stages",
    ],
    accent: "#baff29",
    gradient: ["#0d3b3b", "#1a8a6b", "#baff29"],
    href: "https://www.ssbdfest.com/",
    rotate: 2,
  },
  {
    id: "whoa-wed-sep16",
    title: "WHOA Wednesday — Spooky Secret Lineup",
    dateLabel: "September 16",
    timeLabel: "7PM – Midnight",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-09-16",
    details: ["Spooky Secret DJ Lineup", "RSVP for 1 free NA drink"],
    tags: ["$10 Early Bird", "$15 General Admission"],
    accent: "#ff5e1a",
    gradient: ["#1a0a2e", "#8a2be2", "#ff5e1a"],
    rotate: -3,
    // General admission at the door, day-of; $10 any day before.
    priceCents: 1500,
    earlyBirdPriceCents: 1000,
  },
];
