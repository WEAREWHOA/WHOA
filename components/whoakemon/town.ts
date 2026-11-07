/**
 * WHOA TOWN.
 *
 * Pallet Town's shape: a handful of houses with red roofs, a lab at
 * the south end, water below it, trees all the way round, and a dirt
 * path connecting the lot. Every door is a page.
 *
 * The map is a grid of characters because that is the only format
 * where a mistake is visible. A list of {x, y, tile} objects is the
 * same data and nobody can see the town in it, so a door with no
 * walkable square in front of it would sit there unnoticed. Here you
 * can read the building and see the gap under the door.
 *
 * APPROACHING A DOOR. Every door sits on the bottom wall of its
 * building with a walkable square directly below, because that is the
 * only way you can reach it: you walk up into a door, as you do in
 * the games. The test in the scratchpad checks this for every door
 * rather than trusting the picture, since a one-character slip puts a
 * roof tile under a door and makes a page unreachable.
 */

/**
 *   T tree      . grass     , path      W water     f flowers
 *   ^ roof      B lab roof  # wall     L lamp post
 *   1-9 a way in, see WAYS_IN below
 */
export const MAP = [
  "TTTTTTTTTTTTTTTTTTTT",
  "T........,.........T",
  "T.^^^^...,...^^^^..T",
  "T.####...,...####..T",
  "T.##1#...,...#2##..T",
  "T.9......,.........T",
  "T,,,,,,,,,,,,,,,,,,T",
  "T...f..L.,.L..f....T",
  "T.^^^^...,...^^^^..T",
  "T.####...,...####..T",
  "T.##3#...,...#4##..T",
  "T,,,,,,,,,,,,,,,,,,T",
  "T...BBBBBBBBBBB....T",
  "T...#####5#####....T",
  "T.7.,,,,,,,,,,,,.8.T",
  "TWWWWWWWWWWWWWWWWWWT",
] as const;

export const COLS = MAP[0].length;
export const ROWS = MAP.length;

/** Tiles you can stand on. Everything else stops you. */
const WALKABLE = new Set([".", ",", "f"]);

export type WayKind = "door" | "sign";

export interface WayIn {
  key: string;
  kind: WayKind;
  href: string;
  /** What the town calls it. */
  name: string;
  /** The line in the dialogue box, written as the game would. */
  says: string;
  /**
   * Which row the name sits on, for doors.
   *
   * Explicit rather than "the door's row minus one", because the
   * houses have a one-row roof over two rows of wall and the lab has
   * its roof directly above its door, so a single offset puts half
   * the labels across the windows. Which it did.
   */
  labelRow?: number;
}

/**
 * Doors are walked into and take you straight there, as they do in
 * the games. Signs are solid: you bump into one, it talks, and then
 * you choose whether to follow it. That split is deliberate, because
 * a door you step on by accident costs you a page load, and a sign
 * you cannot avoid reading costs nothing.
 */
export const WAYS_IN: Record<string, WayIn> = {
  "1": {
    key: "1",
    kind: "door",
    labelRow: 2,
    href: "/shop",
    name: "WHOA Shop",
    says: "WHOA SHOP. Everything we make is in here.",
  },
  "2": {
    key: "2",
    kind: "door",
    labelRow: 2,
    href: "/events",
    name: "Events Hall",
    says: "EVENTS HALL. Something is on most weeks.",
  },
  "3": {
    key: "3",
    kind: "door",
    labelRow: 8,
    href: "/join",
    name: "Crew House",
    says: "CREW HOUSE. Rep WHOA, earn on every sale.",
  },
  "4": {
    key: "4",
    kind: "door",
    labelRow: 8,
    href: "/whoadega",
    name: "WHOADEGA",
    says: "WHOADEGA. The real shop, out on Ocean Beach.",
  },
  "5": {
    key: "5",
    kind: "door",
    labelRow: 12,
    href: "/whoa-card",
    name: "WHOA LAB",
    says: "WHOA LAB. Come in. I have something for you.",
  },
  "7": {
    key: "7",
    kind: "sign",
    href: "/about",
    name: "Town sign",
    says: "WHOA TOWN. Where it all started. Read about us?",
  },
  "8": {
    key: "8",
    kind: "sign",
    href: "/whoa-map",
    name: "Map board",
    says: "A map of the whole world, stuck full of pins. Look?",
  },
  "9": {
    key: "9",
    kind: "sign",
    href: "/portal",
    name: "Your PC",
    says: "YOUR PC. Orders, wallet, the lot. Log in?",
  },
};

export function tileAt(x: number, y: number): string {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return "T";
  return MAP[y][x];
}

/** A door counts as walkable: you step onto it and it takes you in. */
export function canStandOn(x: number, y: number): boolean {
  const t = tileAt(x, y);
  return WALKABLE.has(t) || WAYS_IN[t]?.kind === "door";
}

/** Where you come out of your house. Below the shop door, facing down,
 *  which is the first thing that happens in every one of these games. */
export const START = { x: 4, y: 5, facing: "down" as const };

export type Facing = "up" | "down" | "left" | "right";

export const STEPS: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};
