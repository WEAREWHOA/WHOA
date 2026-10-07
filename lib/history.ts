/**
 * WHOA's timeline, as told by the founders. Rendered by /about/history
 * and its map.
 *
 * `place` is the label shown on the card. Leave it off rather than guess.
 */
export interface HistoryEntry {
  year: string;
  title: string;
  place?: string;
  milestones: string[];
  link?: { href: string; label: string };
}

export const HISTORY_DESCRIPTION =
  "WHOA's history, 2015 to today: from WASANI's first WHOA song and hand-dyed tees in San Diego to beach pop-ups, artist collabs, our Ocean Beach shop and SSBD.";

export const HISTORY: HistoryEntry[] = [
  {
    year: "2015",
    title: "It starts with a song",
    place: "San Diego",
    milestones: [
      "WASANI and Reece release the official WHOA song.",
      "The first WHOA stickers are printed and the first WHOA t-shirt is made.",
      "WASANI begins an official music collaboration with Taylor Gang Entertainment.",
    ],
    link: { href: "/music-collective/wasani", label: "Meet WASANI" },
  },
  {
    year: "2016",
    title: "The OG WHOA shirt",
    milestones: [
      "We tie-dye our first t-shirt.",
      "The OG WHOA shirt goes on sale.",
    ],
  },
  {
    year: "2017",
    title: "First artist collab",
    milestones: ["Our first official artist collab merch drop."],
    link: { href: "/art-collective", label: "The Art Collective" },
  },
  {
    year: "2018",
    title: "Making it official",
    place: "Laguna Beach",
    milestones: [
      "WHOA is officially founded as an LLC.",
      "Our first official beach pop-up, in Laguna Beach.",
    ],
  },
  {
    year: "2019",
    title: "The first collection",
    milestones: ["We release our first official WHOA collection: seven merch items."],
  },
  {
    year: "2020",
    title: "San Diego beach pop-ups",
    place: "San Diego beaches",
    milestones: [
      "Our first official beach pop-ups in San Diego: Mission Beach, Pacific Beach, Ocean Beach and La Jolla.",
    ],
  },
  {
    year: "2021",
    title: "Collabs & our first retail pop-up",
    place: "Laguna Beach",
    milestones: [
      "Official merch collabs with Player Dave, Charles The 1st, Kaipora, HuntHux and Boogie Mob.",
      "Our first retail shop pop-up, in Laguna Beach.",
    ],
  },
  {
    year: "2022",
    title: "Behind the decks & Art Basel",
    place: "SSBD · Miami",
    milestones: [
      "WASANI's first official booking as a DJ.",
      "Our first year building and providing the sound for the Creation Station at Same Same But Different.",
      "WHOA product placement in a Miami boutique during Art Basel.",
    ],
  },
  {
    year: "2023",
    title: "Connect San Diego & WHOA Wednesdays",
    place: "San Diego",
    milestones: [
      "We join Connect San Diego and open our first retail shop experience in the back room.",
      "The first official WHOA Wednesdays.",
    ],
    link: { href: "/events", label: "See upcoming events" },
  },
  {
    year: "2024",
    title: "Going international",
    place: "El Salvador",
    milestones: [
      "WASANI's first international booking as a DJ, in El Salvador.",
      "The first official WHOADEGA pop-up shop, at Yoon & DDR.",
    ],
  },
  {
    year: "2025",
    title: "The WHOADEGA opens in Ocean Beach",
    place: "Ocean Beach",
    milestones: ["We open our first shop: the WHOADEGA, on Newport Ave in Ocean Beach, San Diego."],
    link: { href: "/stores", label: "Find the shop" },
  },
  {
    year: "2026",
    title: "Festival sponsor",
    place: "Lake Perris",
    milestones: ["WHOA sponsors its first major music festival: Same Same But Different."],
    link: { href: "/events", label: "Catch us at the next one" },
  },
];
