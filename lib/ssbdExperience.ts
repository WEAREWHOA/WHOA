/**
 * The four areas of the SSBD village.
 *
 * Every one maps to a real place at the festival *and* to something this
 * site already does, so walking into a hut always lands somewhere with
 * substance rather than a coming-soon page:
 *
 *   WHOADEGA        → the shop (the bazaar, in the village)
 *   ARCADE          → the eleven games already built under /games
 *   CREATION STATION→ the custom design editor
 *   WHOA OASIS      → the pre-order catalogue
 *
 * Deliberately not here: the Art and Music Collectives, which are locked
 * behind "coming soon" (see lib/lockedRoutes.ts) — a village hut you can
 * walk into and find nothing is worse than no hut.
 */

export interface VillageZone {
  id: string;
  /** Shown carved on the sign. */
  name: string;
  /** One line, in the village's voice. */
  blurb: string;
  href: string;
  /** Where the hut sits in the 1000x800 village viewBox. */
  x: number;
  y: number;
  /** Ties the hut, its sign and its card to one colour. */
  accent: string;
}

export const VILLAGE_ZONES: VillageZone[] = [
  {
    id: "whoadega",
    name: "THE WHOADEGA",
    blurb: "The bazaar. Stalls, racks and everything with our name on it.",
    href: "/shop",
    x: 250,
    y: 250,
    accent: "#ff7a00",
  },
  {
    id: "arcade",
    name: "THE ARCADE",
    blurb: "Eleven games, no quarters. Snake, graffiti, beat pads and more.",
    href: "/games",
    x: 750,
    y: 250,
    accent: "#7b2ff7",
  },
  {
    id: "creation-station",
    name: "CREATION STATION",
    blurb: "Draw your own piece and we'll put it on real fabric.",
    href: "/custom-design",
    x: 250,
    y: 560,
    accent: "#2ea8c7",
  },
  {
    id: "oasis",
    name: "WHOA OASIS",
    blurb: "Water, shade, and a catalogue of things not made yet.",
    href: "/oasis",
    x: 750,
    y: 560,
    accent: "#e8a33d",
  },
];
