/**
 * The four doors of the SSBD experience, one per element.
 *
 * Each maps to something this site already does, so a door always opens
 * on something real:
 *
 *   FIRE  → the shop, the hottest thing WHOA makes
 *   AIR   → the games, light and quick
 *   EARTH → the scavenger hunt, walked on real ground
 *   WATER → the story, which runs deep
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
    id: "shop",
    element: "fire",
    name: "SHOP",
    blurb: "Everything with our name on it.",
    href: "/shop",
    accent: "#ff7a00",
    accentDeep: "#ff2f1a",
  },
  {
    id: "games",
    element: "air",
    name: "GAMES",
    blurb: "Eleven of them. No quarters needed.",
    href: "/games",
    accent: "#b9a7ff",
    accentDeep: "#6d4fd6",
  },
  {
    id: "journey",
    element: "earth",
    name: "THE JOURNEY",
    blurb: "Six hidden codes, one per WHOA branch. Find them all.",
    href: "/games/hunt",
    accent: "#9ecf6d",
    accentDeep: "#3f6b2e",
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
