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
  // Real flyer photo, under public/events/ — shown as the card/calendar
  // cover in place of the CSS gradient when set. Omitted means the event
  // still gets the gradient-only treatment (no flyer image on file yet).
  imageUrl?: string;
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

// Pulls the last "H(AM|PM)" out of a time label — e.g. "7PM – 11PM" -> 23,
// "9PM–4AM" -> { hour: 4, overnight: true } (the range crosses midnight,
// detected by the closing hour being earlier in the day than the opening
// one). Returns undefined for a label with nothing clock-shaped in it
// ("3 Days", "WHOADEGA Art Gallery Experience").
function parseClosingHour(timeLabel: string): { hour: number; overnight: boolean } | undefined {
  const matches = [...timeLabel.matchAll(/(\d{1,2})\s*(AM|PM)/gi)];
  if (matches.length === 0) return undefined;

  const toHour24 = (raw: string, meridiem: string) => (Number(raw) % 12) + (meridiem.toUpperCase() === "PM" ? 12 : 0);
  const hour = toHour24(matches[matches.length - 1][1], matches[matches.length - 1][2]);
  const overnight = matches.length > 1 && hour < toHour24(matches[0][1], matches[0][2]);
  return { hour, overnight };
}

// When ticket/RSVP purchasing for an event actually closes: its own stated
// end time on its last day (crossing into the next calendar day for an
// overnight window like "9PM–4AM"), or 11PM on its last day when no time
// is stated at all.
export function getTicketingCloseDate(event: EventInfo): Date {
  const lastDay = event.endDate ?? event.startDate;
  const closing = parseClosingHour(event.timeLabel);
  const close = new Date(`${lastDay}T00:00:00`);
  if (closing) {
    close.setDate(close.getDate() + (closing.overnight ? 1 : 0));
    close.setHours(closing.hour, 0, 0, 0);
  } else {
    close.setHours(23, 0, 0, 0);
  }
  return close;
}

// Whether an event's ticket/RSVP link (in-app or an outbound href) should
// still be live. Once an event has closed, every CTA — Buy Tickets, Free
// RSVP, or an external ticketing link — shows as ended instead, rather than
// staying clickable forever for something that already happened.
export function isTicketingOpen(event: EventInfo, referenceDate: Date = new Date()): boolean {
  return referenceDate < getTicketingCloseDate(event);
}

// Soonest-upcoming-first, then most-recent-past-first — same split/sort
// convention as lib/eventRsvps.ts's getEventHistoryForAccount and
// lib/eventsAdmin.ts's getEventsAdminOverview. EVENTS itself is authored in
// plain chronological order (oldest first), which would otherwise bury the
// handful of actually-upcoming events under a growing pile of historical
// flyers on /events — this is what /events' grid/calendar display order
// should use instead of the array's raw order.
// Whether an event needs the damage-responsibility waiver before checkout
// — any event held at the WHOAdega or SH!FT Gallery, derived from the
// venue text rather than a manually-set flag so a newly authored event
// picks it up automatically as long as its venue says so. Only matters for
// events with an in-app checkout — one with its own external href never
// reaches this app's checkout at all, waiver or not.
export function requiresDamageWaiver(event: EventInfo): boolean {
  return /WHOAdega|SH!FT/i.test(event.venue);
}

export function sortEventsByProximity(events: EventInfo[], referenceDate: Date = new Date()): EventInfo[] {
  const todayKey = referenceDate.toISOString().slice(0, 10);
  const upcoming: EventInfo[] = [];
  const past: EventInfo[] = [];

  for (const event of events) {
    const endDate = event.endDate ?? event.startDate;
    if (endDate >= todayKey) upcoming.push(event);
    else past.push(event);
  }

  upcoming.sort((a, b) => a.startDate.localeCompare(b.startDate));
  past.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return [...upcoming, ...past];
}

export const EVENTS: EventInfo[] = [
  {
    id: "auf-eddym-jan24",
    imageUrl: "/events/auf-eddym-jan24.webp",
    title: "AUF Presents: Eddy M",
    dateLabel: "January 24",
    timeLabel: "9PM – Late",
    venue: "Secret San Diego Location",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-01-24",
    lineup: ["Eddy M", "Disco Service", "Jax Carter", "Will On Cloud Nine", "Moncion"],
    details: ["Funktion-One Sound"],
    tags: ["21+"],
    accent: "#7a5cff",
    gradient: ["#05061a", "#1a1a4a", "#7a5cff"],
    rotate: 2,
  },
  {
    id: "whoa-wed-jan28",
    imageUrl: "/events/whoa-wed-jan28.webp",
    title: "WHOA Wednesday",
    dateLabel: "January 28",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-01-28",
    lineup: ["Jonn Yboy", "Anzio", "Ivy Nyx", "Wasani"],
    tags: ["Free Entry", "All Ages"],
    accent: "#29e6ff",
    gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"],
    rotate: -3,
  },
  {
    id: "happy-world-jan30",
    imageUrl: "/events/happy-world-jan30.jpg",
    title: "Happy World Fundraiser",
    dateLabel: "January 30",
    timeLabel: "7PM – 11PM",
    venue: "The Templar",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-01-30",
    details: ["A Cosmic Extravaganza for a Greater Cause"],
    lineup: ["Wasani", "Pineapple Flow", "Snowhite"],
    accent: "#c729ff",
    gradient: ["#10021a", "#4a0a5c", "#c729ff"],
    rotate: -2,
  },
  {
    id: "whoa-wed-feb4",
    imageUrl: "/events/whoa-wed-feb4.webp",
    title: "WHOA Wednesday",
    dateLabel: "February 4",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-02-04",
    details: ["Hosted by Wasani featuring Show Shonna"],
    tags: ["Free Entry", "All Ages"],
    accent: "#ff7a00",
    gradient: ["#2a0a3a", "#7b2ff7", "#ff7a00"],
    rotate: 3,
  },
  {
    id: "whoa-wed-feb11",
    imageUrl: "/events/whoa-wed-feb11.webp",
    title: "WHOA Wednesday",
    dateLabel: "February 11",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-02-11",
    details: ["Hosted by Wasani featuring Noél"],
    tags: ["Free Entry", "All Ages"],
    accent: "#29ffe6",
    gradient: ["#06121a", "#0c3d4a", "#29ffe6"],
    rotate: -4,
  },
  {
    id: "quartyard-valentines-feb14",
    imageUrl: "/events/quartyard-valentines-feb14.webp",
    title: "Every Time We Touch — A Valentine's Day Special",
    dateLabel: "February 14",
    timeLabel: "5PM – 9PM",
    venue: "Quartyard SD",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-02-14",
    lineup: ["Honeycomb", "Plexusplay", "Match.A.Mor", "Indigo Valet"],
    details: ["Dinner, show, dancing, and live art", "Price is per couple"],
    tags: ["$15 GA", "$25 Door"],
    accent: "#ff8a5c",
    gradient: ["#2a0a1a", "#7a2f3a", "#ff8a5c"],
    priceCents: 1500,
    rotate: 2,
  },
  {
    id: "whoa-wed-feb18",
    imageUrl: "/events/whoa-wed-feb18.webp",
    title: "WHOA Wednesday",
    dateLabel: "February 18",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-02-18",
    lineup: ["Menlo", "Wanderin Wook", "Hell Gnar", "Wasani"],
    accent: "#ff2fb0",
    gradient: ["#0a0116", "#3a0a3a", "#ff2fb0"],
    rotate: 4,
  },
  {
    id: "girls-gallery-feb25",
    imageUrl: "/events/girls-gallery-feb25.jpg",
    title: "It's A Girls Gallery Art Show",
    dateLabel: "February 25",
    timeLabel: "6PM – 10PM",
    venue: "SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "shows",
    startDate: "2026-02-25",
    details: ["Featuring all women artists"],
    accent: "#ffcf29",
    gradient: ["#1a1205", "#6b4a0a", "#ffcf29"],
    rotate: -2,
  },
  {
    id: "whoa-wed-mar11",
    imageUrl: "/events/whoa-wed-mar11.webp",
    title: "WHOA Wednesday",
    dateLabel: "March 11",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-03-11",
    details: ["Hosted by Wasani featuring Vezy"],
    accent: "#baff29",
    gradient: ["#0d3b3b", "#1a8a6b", "#baff29"],
    rotate: 3,
  },
  {
    id: "skyisa-mar14",
    imageUrl: "/events/skyisa-mar14.webp",
    title: "Skyisa — Gradient Bloom Tour",
    dateLabel: "March 14",
    timeLabel: "Evening",
    venue: "Trilogy Sanctuary",
    location: "La Jolla, CA",
    category: "shows",
    startDate: "2026-03-14",
    details: ["Presented by Tiger Fox"],
    lineup: ["Skyisa", "Habitaat", "Earthwave"],
    accent: "#29b6ff",
    gradient: ["#05131a", "#0a3a5c", "#29b6ff"],
    rotate: -3,
  },
  {
    id: "wicked-wellness-mar14",
    imageUrl: "/events/wicked-wellness-mar14.webp",
    title: "Wicked Wellness — A One-Day Yoga & Wellness Festival",
    dateLabel: "March 14",
    timeLabel: "11AM – 3PM",
    venue: "Terra Nova",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-03-14",
    details: [
      "Opening Ceremony: Movement & Anchoring",
      "Anti-Gravity School: Mobility & Arm Balances",
      "Embodied Characters: Dance Workshop",
      "DJ set by Chris Light",
    ],
    accent: "#b6ff29",
    gradient: ["#0a1a05", "#3a6b1a", "#b6ff29"],
    rotate: 2,
  },
  {
    id: "techno4all-mar15",
    title: "Techno 4 All",
    dateLabel: "March 15",
    timeLabel: "10PM – Late",
    venue: "Secret San Diego Warehouse",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-03-15",
    lineup: ["Drunken Kong", "Michelle Mendez", "Raindrop", "Agents of Alchemy", "Sol/TK"],
    details: ["Presented by New Life Sounds x Steppin' TX Checkout x Ravers R Us"],
    accent: "#ff3b3b",
    gradient: ["#1a0505", "#7a1a1a", "#ff3b3b"],
    rotate: -4,
  },
  {
    id: "whoa-wed-mar18",
    imageUrl: "/events/whoa-wed-mar18.webp",
    title: "WHOA Wednesday — Celebrating Wasani's 30th Birthday",
    dateLabel: "March 18",
    timeLabel: "7PM – 12AM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-03-18",
    accent: "#ff5e1a",
    gradient: ["#1a0a2e", "#8a2be2", "#ff5e1a"],
    rotate: 3,
  },
  {
    id: "whoa-wed-mar25",
    imageUrl: "/events/whoa-wed-mar25.webp",
    title: "WHOA Wednesday",
    dateLabel: "March 25",
    timeLabel: "8PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-03-25",
    details: ["Hosted by Wasani featuring Zalez"],
    accent: "#29e6ff",
    gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"],
    rotate: -2,
  },
  {
    id: "whoa-wed-apr1",
    imageUrl: "/events/whoa-wed-apr1.webp",
    title: "WHOA Wednesday",
    dateLabel: "April 1",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-04-01",
    details: ["Hosted by Wasani featuring Radiant Robes"],
    accent: "#ff2fb0",
    gradient: ["#0a0116", "#3a0a3a", "#ff2fb0"],
    rotate: 4,
  },
  {
    id: "shlump-apr4",
    imageUrl: "/events/shlump-apr4.webp",
    title: "The Chronicles of Shlump Tour",
    dateLabel: "April 4",
    timeLabel: "Evening",
    venue: "Music Box",
    location: "1337 India St, San Diego, CA",
    category: "shows",
    startDate: "2026-04-04",
    href: "https://www.shlumpofficial.com",
    accent: "#c729ff",
    gradient: ["#10021a", "#4a0a5c", "#c729ff"],
    rotate: -3,
  },
  {
    id: "whoa-wed-apr8",
    imageUrl: "/events/whoa-wed-apr8.webp",
    title: "WHOA Wednesday",
    dateLabel: "April 8",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-04-08",
    details: ["Hosted by Wasani featuring Blue Jade"],
    accent: "#ffb800",
    gradient: ["#1a3a5c", "#c9522f", "#ffb800"],
    rotate: 2,
  },
  {
    id: "jantsen-apr10",
    imageUrl: "/events/jantsen-apr10.jpg",
    title: "Jantsen + Ruvlo",
    dateLabel: "April 10",
    timeLabel: "8PM",
    venue: "Music Box",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-04-10",
    lineup: ["Jantsen", "Ruvlo", "Phocust", "Eklypse", "Noahfence"],
    details: ["Presented by Psychosis Events"],
    tags: ["21+"],
    href: "https://www.jantsen.net",
    accent: "#ff3b3b",
    gradient: ["#1a0505", "#7a1a1a", "#ff3b3b"],
    rotate: -4,
  },
  {
    id: "psychedelic-artshow-apr15",
    imageUrl: "/events/psychedelic-artshow-apr15.jpg",
    title: "It's A Psychedelic Art Show",
    dateLabel: "April 15",
    timeLabel: "6PM – 10PM",
    venue: "SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "shows",
    startDate: "2026-04-15",
    details: ["Presented by Connect SD"],
    accent: "#7a5cff",
    gradient: ["#05061a", "#1a1a4a", "#7a5cff"],
    rotate: 3,
  },
  {
    id: "whoadega-anniversary-apr20",
    imageUrl: "/events/whoadega-anniversary-apr20.webp",
    title: "WHOADEGA 1 Year Anniversary",
    dateLabel: "April 20",
    timeLabel: "12PM – 8PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego, CA 92107",
    category: "shows",
    startDate: "2026-04-20",
    details: ["Presented by Connect SD", "Live DJs, 50+ artists & vendors, giveaways, art gallery"],
    accent: "#ffb800",
    gradient: ["#1a3a5c", "#c9522f", "#ffb800"],
    rotate: -2,
  },
  {
    id: "whoa-wed-anniversary-apr22",
    imageUrl: "/events/whoa-wed-anniversary-apr22.webp",
    title: "WHOA Wednesday — 1 Year Anniversary",
    dateLabel: "April 22",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-04-22",
    lineup: ["Dr. Play", "Sonny Sonshine", "Mini Skrt", "Match.A.Mor"],
    tags: ["Free Entry"],
    accent: "#fff229",
    gradient: ["#c97a2f", "#e0a94e", "#fff229"],
    rotate: 4,
  },
  {
    id: "submerged-apr25",
    title: "Same Same Presents: Submerged — Dirt Monkey",
    dateLabel: "April 25",
    timeLabel: "9PM – Late",
    venue: "Spin Nightclub",
    location: "2028 Hancock St, San Diego, CA",
    category: "shows",
    startDate: "2026-04-25",
    lineup: ["Dirt Monkey"],
    tags: ["21+"],
    accent: "#29b6ff",
    gradient: ["#05131a", "#0a3a5c", "#29b6ff"],
    rotate: -3,
  },
  {
    id: "other-worlds-apr25",
    imageUrl: "/events/other-worlds-apr25.jpg",
    title: "Bazaar Presents: Other Worlds",
    dateLabel: "April 25",
    timeLabel: "Evening",
    venue: "San Diego, CA",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-04-25",
    lineup: ["Maso", "Ion", "Sechmun", "Shwilly", "Tree Caub"],
    accent: "#ff8a5c",
    gradient: ["#2a0a1a", "#7a2f3a", "#ff8a5c"],
    rotate: 2,
  },
  {
    id: "whoa-wed-apr29",
    imageUrl: "/events/whoa-wed-apr29.webp",
    title: "WHOA Wednesday",
    dateLabel: "April 29",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-04-29",
    details: ["Hosted by Wasani featuring Dub Era"],
    accent: "#ff8a5c",
    gradient: ["#2a0a1a", "#7a2f3a", "#ff8a5c"],
    rotate: 2,
  },
  {
    id: "visual-voyage-may6",
    imageUrl: "/events/visual-voyage-may6.jpg",
    title: "Visual Voyage — Immersive Lighting Exhibit",
    dateLabel: "May 6",
    timeLabel: "6PM – 10PM",
    venue: "SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "shows",
    startDate: "2026-05-06",
    details: ["Presented by Connect SD"],
    accent: "#c729ff",
    gradient: ["#10021a", "#4a0a5c", "#c729ff"],
    rotate: -4,
  },
  {
    id: "wicked-wellness-may9",
    imageUrl: "/events/wicked-wellness-may9.jpg",
    title: "Wicked Wellness — A One-Day Yoga & Wellness Festival",
    dateLabel: "May 9",
    timeLabel: "11AM – 3PM",
    venue: "Terra Nova",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-05-09",
    details: ["Movement & Meditation", "Guided Acro Yoga", "Dance & Expression", "Healing Sessions", "Herbal Elixirs"],
    accent: "#b6ff29",
    gradient: ["#0a1a05", "#3a6b1a", "#b6ff29"],
    rotate: 3,
  },
  {
    id: "whoa-wed-may13",
    imageUrl: "/events/whoa-wed-may13.webp",
    title: "WHOA Wednesday",
    dateLabel: "May 13",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-05-13",
    details: ["Takeover by Disco Pineapple and Wook Plugs"],
    accent: "#ff2fb0",
    gradient: ["#0a0116", "#3a0a3a", "#ff2fb0"],
    rotate: -2,
  },
  {
    id: "whoa-wed-may20",
    imageUrl: "/events/whoa-wed-may20.webp",
    title: "WHOA Wednesday",
    dateLabel: "May 20",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-05-20",
    details: ["Hosted by Wasani featuring Gnohm"],
    accent: "#29ffe6",
    gradient: ["#06121a", "#0c3d4a", "#29ffe6"],
    rotate: 4,
  },
  {
    id: "whoa-wed-may27",
    imageUrl: "/events/whoa-wed-may27.webp",
    title: "WHOA Wednesday",
    dateLabel: "May 27",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-05-27",
    details: ["Hosted by Wasani featuring Lizárdavinci"],
    accent: "#ffcf29",
    gradient: ["#1a1205", "#6b4a0a", "#ffcf29"],
    rotate: -3,
  },
  {
    id: "whoa-wed-jun3",
    imageUrl: "/events/whoa-wed-jun3.webp",
    title: "WHOA Wednesday",
    dateLabel: "June 3",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-06-03",
    details: ["Hosted by Wasani featuring Jovella"],
    accent: "#ff7a00",
    gradient: ["#2a0a3a", "#7b2ff7", "#ff7a00"],
    rotate: 2,
  },
  {
    id: "blossom-roar-jun4",
    title: "Blossom Roar Presents: Once Upon A Time",
    dateLabel: "June 4 – 7",
    timeLabel: "4 Days",
    venue: "1 Hr East of San Diego",
    location: "1 Hr East of San Diego, CA",
    category: "festivals",
    startDate: "2026-06-04",
    endDate: "2026-06-07",
    lineup: ["Atyya", "Caryac", "+ more"],
    details: ["Workshops, performances, live music, yoga, fire flow, wellness, and community"],
    accent: "#baff29",
    gradient: ["#0d3b3b", "#1a8a6b", "#baff29"],
    rotate: -4,
  },
  {
    id: "whoa-wed-jun17",
    imageUrl: "/events/whoa-wed-jun17.webp",
    title: "WHOA Wednesday — Not Not A Birthday Throwdown",
    dateLabel: "June 17",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-06-17",
    lineup: ["Zeebruh", "GizMotty", "K.lypso", "B.Schill", "Cole G"],
    accent: "#7a5cff",
    gradient: ["#05061a", "#1a1a4a", "#7a5cff"],
    rotate: 3,
  },
  {
    id: "submerged-jun20",
    imageUrl: "/events/submerged-jun20.webp",
    title: "Same Same Presents: Submerged",
    dateLabel: "June 20",
    timeLabel: "9PM – Late",
    venue: "Spin Nightclub",
    location: "2028 Hancock St, San Diego, CA",
    category: "shows",
    startDate: "2026-06-20",
    lineup: ["Late Night Radio", "Josh Teed", "Noamadic"],
    tags: ["21+"],
    accent: "#29b6ff",
    gradient: ["#05131a", "#0a3a5c", "#29b6ff"],
    rotate: -2,
  },
  {
    id: "whoa-wed-jun24",
    imageUrl: "/events/whoa-wed-jun24.webp",
    title: "WHOA Wednesday",
    dateLabel: "June 24",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega × SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-06-24",
    details: ["Hosted by Wasani featuring Martini"],
    accent: "#ff3b3b",
    gradient: ["#1a0505", "#7a1a1a", "#ff3b3b"],
    rotate: 4,
  },
  {
    id: "smoakland-jul4",
    imageUrl: "/events/smoakland-jul4.webp",
    title: "Smoakland: Project Cosmic",
    dateLabel: "July 4",
    timeLabel: "9PM – 4AM",
    venue: "Spin Nightclub",
    location: "San Diego, CA",
    category: "shows",
    startDate: "2026-07-04",
    lineup: [
      "Brainrack b2b Wiley",
      "Bass Kitty",
      "Chorp",
      "Dismantlz",
      "Grog",
      "Kurtzee",
      "Mini Handz",
      "Mollipop",
      "Ramonasaur",
      "Scum Wubz",
      "Woka",
    ],
    details: ["Presented by Psychosis Events", "Two stages"],
    tags: ["21+"],
    accent: "#ffcf29",
    gradient: ["#1a1205", "#6b4a0a", "#ffcf29"],
    rotate: -3,
  },
  {
    id: "whoa-wed-jul8",
    imageUrl: "/events/whoa-wed-jul8.webp",
    title: "WHOA Wednesday",
    dateLabel: "July 8",
    timeLabel: "7PM – 11PM",
    venue: "The WHOAdega",
    location: "4847 Newport Ave, San Diego",
    category: "whoadega",
    startDate: "2026-07-08",
    details: ["Special guest DJs"],
    tags: ["Free Entry", "All Ages"],
    accent: "#c729ff",
    gradient: ["#10021a", "#4a0a5c", "#c729ff"],
    rotate: 2,
  },
  {
    id: "mythic-imagination-jul8",
    imageUrl: "/events/mythic-imagination-jul8.jpg",
    title: "Mythic Imagination — Sojourner Solo Show",
    dateLabel: "July 8",
    timeLabel: "6PM – 10PM",
    venue: "SH!FT Gallery",
    location: "4847 Newport Ave, San Diego",
    category: "shows",
    startDate: "2026-07-08",
    accent: "#ff8a5c",
    gradient: ["#2a0a1a", "#7a2f3a", "#ff8a5c"],
    rotate: -4,
  },
  {
    id: "submerged-jul11",
    title: "Same Same Presents: Submerged",
    dateLabel: "July 11",
    timeLabel: "9PM – Late",
    venue: "Spin Nightclub",
    location: "2028 Hancock St, San Diego, CA",
    category: "shows",
    startDate: "2026-07-11",
    details: ["Artist TBA"],
    tags: ["21+"],
    accent: "#29b6ff",
    gradient: ["#05131a", "#0a3a5c", "#29b6ff"],
    rotate: 3,
  },
  {
    id: "whoa-wed-jul15",
    imageUrl: "/events/whoa-wed-jul15.webp",
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
    imageUrl: "/events/whoa-wed-jul22.webp",
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
    imageUrl: "/events/whoa-wed-jul29.webp",
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
    imageUrl: "/events/bayfest-2026.webp",
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
    imageUrl: "/events/ssbd-2026.webp",
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
    id: "submerged-aug15",
    title: "Same Same Presents: Submerged — Maddy O'Neal",
    dateLabel: "August 15",
    timeLabel: "9PM – Late",
    venue: "Spin Nightclub",
    location: "2028 Hancock St, San Diego, CA",
    category: "shows",
    startDate: "2026-08-15",
    lineup: ["Maddy O'Neal"],
    tags: ["21+"],
    accent: "#ff2fb0",
    gradient: ["#0a0116", "#3a0a3a", "#ff2fb0"],
    rotate: -2,
  },
  {
    id: "whoa-wed-sep16",
    imageUrl: "/events/whoa-wed-sep16.webp",
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
