/**
 * The four doors of the SSBD experience, one per element.
 *
 * Each maps to something this site already does, so a door always opens
 * on something real:
 *
 *   EARTH → the scavenger card, stamped on real ground
 *   AIR   → the games, light and quick
 *   FIRE  → the shop, the hottest thing WHOA makes
 *   WATER → the story, which runs deep
 *
 * The scavenger leads because /go is the URL on every flyer in Creation
 * Station: whoever is reading this page most likely just scanned one.
 *
 * Elements are not decoration here: each one drives its box's colour and
 * its animation, so the four read as four different things at a glance
 * rather than four tiles in four hues.
 */

export type Element = "fire" | "water" | "air" | "earth";

export interface ExperienceDoor {
  id: string;
  element: Element;
  /** Big, on the box. */
  name: string;
  /** One line underneath. */
  blurb: string;
  href: string;
  /** Core colour, and the one the animation is drawn in. */
  accent: string;
  /** Second colour, for the gradient the box sits in. */
  accentDeep: string;
}

export const EXPERIENCE_DOORS: ExperienceDoor[] = [
  {
    id: "scavenger",
    element: "earth",
    name: "SCAVENGER",
    blurb: "Six flyers around Creation Station. Scan them all.",
    href: "/go/scavenger",
    accent: "#9ecf6d",
    accentDeep: "#3f6b2e",
  },
  {
    id: "games",
    element: "air",
    name: "GAMES",
    blurb: "Five of them. No quarters needed.",
    href: "/games",
    accent: "#b9a7ff",
    accentDeep: "#6d4fd6",
  },
  {
    id: "shop",
    element: "fire",
    name: "SHOP",
    blurb: "Everything with our name on it.",
    href: "/shop",
    accent: "#ff7a00",
    accentDeep: "#ff2f1a",
  },
  {
    id: "story",
    element: "water",
    name: "STORY OF WHOA",
    blurb: "Where this came from, and who built it.",
    href: "/about",
    accent: "#4fc3e0",
    accentDeep: "#1b6f8c",
  },
];
