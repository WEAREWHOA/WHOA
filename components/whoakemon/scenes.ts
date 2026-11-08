/**
 * WHOA TOWN AND WHAT IS INSIDE THE BUILDINGS.
 *
 * A door used to be a link: walk in, the page changes, the game is
 * over. Now a door is a doorway. You walk in, the screen becomes a
 * room, and the thing you came for is in there with somebody standing
 * behind a counter.
 *
 * That is the difference between a game with links in it and a game.
 * It also means the shop is not a picture of the shop: the attendant
 * is handing you the real catalogue, and the basket you fill is the
 * site's own.
 *
 * Every map is a grid of characters because it is the only format
 * where a mistake is visible. The test in the scratchpad checks the
 * things reading cannot: that no door is unreachable, that every
 * interior has a way out, and that you can get to every attendant.
 */

export type Facing = "up" | "down" | "left" | "right";

export const STEPS: Record<Facing, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** What pressing A on somebody does. */
export type NpcAction =
  | { kind: "shop" }
  | { kind: "link"; href: string; label: string };

export interface Npc {
  x: number;
  y: number;
  name: string;
  /** What they say when you face them. */
  says: string;
  does: NpcAction;
  /** Which way they are facing while they wait. */
  facing: Facing;
}

export interface Scene {
  id: string;
  kind: "outdoor" | "indoor";
  map: readonly string[];
  npc?: Npc;
  /** Indoors: where the mat puts you back in the world. */
  exit?: { scene: string; x: number; y: number; facing: Facing };
}

/* ─────────────────────────────────────────────────────────────────
   OUTSIDE
   ─────────────────────────────────────────────────────────────────

   T tree      t a tree you can walk through (see SIGNS 6)
   . grass     , path      W water     f flowers    F fence
   ^ roof      B lab roof  # wall      L lamp post
   1-5 a door, 6-9 a sign                                        */

export const TOWN_MAP = [
  "TTTTTTTTTTTTTTTTTTTT",
  "T......T6T.....TT..T",
  "T.FFFF.TtT.....^^^.T",
  "T.F^^^.TtT.....###.T",
  "T.F###.,,,,,,,,#2#.T",
  "T.F#1#.,......,....T",
  "T.F9..,,......,....T",
  "T.FFF.,...WWW.,....T",
  "T.....,...WWW.,,,,,T",
  "T.^^^.,...WWW.^^^.,T",
  "T.###.,.......###.,T",
  "T.#3#.,,,,,,,,#4#.,T",
  "T.....BBBBBBBBB...,T",
  "T.....####5####...,T",
  "T..,,,,,,,,,,7..8,,T",
  "TTTTTTTTTTTTTTTTTTTT",
] as const;

export const TOWN_COLS = TOWN_MAP[0].length;
export const TOWN_ROWS = TOWN_MAP.length;

/**
 * Where you come out of your house: in the fenced yard, beside the
 * door rather than under it.
 *
 * Under it is where these games actually put you, and it was wrong
 * here for two reasons. Up is the first key anybody presses, and two
 * taps of it threw you straight back inside before you had seen the
 * town. It also made the Konami code unenterable from the start
 * square, since the code opens with two ups.
 */
export const START = { scene: "town", x: 5, y: 6, facing: "down" as const };

/** A door in the town, and the room behind it. */
export interface Door {
  key: string;
  to: string;
  name: string;
  says: string;
  /** Which row the name sits on. Explicit, because the houses have a
   *  one-row roof over two rows of wall and the lab has its roof
   *  directly above its door, so one offset puts half the labels
   *  across the windows. Which it did. */
  labelRow: number;
}

export const DOORS: Record<string, Door> = {
  "1": { key: "1", to: "shop", name: "WHOA Shop", says: "WHOA SHOP.", labelRow: 2 },
  "2": { key: "2", to: "events", name: "Events Hall", says: "EVENTS HALL.", labelRow: 2 },
  "3": { key: "3", to: "crew", name: "Crew House", says: "CREW HOUSE.", labelRow: 8 },
  "4": { key: "4", to: "whoadega", name: "WHOADEGA", says: "WHOADEGA.", labelRow: 8 },
  "5": { key: "5", to: "lab", name: "WHOA LAB", says: "WHOA LAB.", labelRow: 12 },
};

/** A sign in the town. Still a link: a sign is a sign. */
export interface Sign {
  key: string;
  href: string;
  name: string;
  says: string;
}

export const SIGNS: Record<string, Sign> = {
  "6": {
    key: "6",
    href: "/spin",
    name: "Hidden clearing",
    says: "Nobody comes back here. There is a wheel. Spin it?",
  },
  "7": {
    key: "7",
    href: "/about",
    name: "Town sign",
    says: "WHOA TOWN. Where it all started. Read about us?",
  },
  "8": {
    key: "8",
    href: "/whoa-map",
    name: "Map board",
    says: "A map of the whole world, stuck full of pins. Look?",
  },
  "9": {
    key: "9",
    href: "/portal",
    name: "Your PC",
    says: "YOUR PC. Orders, wallet, the lot. Log in?",
  },
};

/* ─────────────────────────────────────────────────────────────────
   INSIDE
   ─────────────────────────────────────────────────────────────────

   | wall      _ floor     = counter    S shelf
   P plant     M the mat you leave by   N whoever is in

   Every interior is 16 by 13, which is exactly the size of the
   window onto the world, so indoors the camera has nothing to do and
   the whole room is on screen at once. That is how these rooms work
   in the games and it is also why they feel small and complete.   */

const SHOP_ROOM = [
  "||||||||||||||||",
  "|______________|",
  "|_P__________P_|",
  "|______N_______|",
  "|___========___|",
  "|______________|",
  "|_SS________SS_|",
  "|_SS________SS_|",
  "|______________|",
  "|_SS________SS_|",
  "|______________|",
  "|______MM______|",
  "||||||||||||||||",
] as const;

const PLAIN_ROOM = [
  "||||||||||||||||",
  "|______________|",
  "|_P__________P_|",
  "|______N_______|",
  "|___========___|",
  "|______________|",
  "|______________|",
  "|_P__________P_|",
  "|______________|",
  "|______________|",
  "|______________|",
  "|______MM______|",
  "||||||||||||||||",
] as const;

export const INTERIOR_COLS = SHOP_ROOM[0].length;
export const INTERIOR_ROWS = SHOP_ROOM.length;

/** Where you stand when you come in, which is on the mat. */
export const INTERIOR_ENTRY = { x: 7, y: 11, facing: "up" as const };

function room(
  id: string,
  layout: readonly string[],
  npc: Omit<Npc, "x" | "y" | "facing">,
  exit: { x: number; y: number },
): Scene {
  return {
    id,
    kind: "indoor",
    map: layout,
    // Behind the counter, facing the room, which is where somebody
    // serving stands.
    npc: { x: 7, y: 3, facing: "down", ...npc },
    exit: { scene: "town", x: exit.x, y: exit.y, facing: "down" },
  };
}

export const SCENES: Record<string, Scene> = {
  town: { id: "town", kind: "outdoor", map: TOWN_MAP },

  // The door is at (4,5); you come back out below it.
  shop: room(
    "shop",
    SHOP_ROOM,
    {
      name: "Shop staff",
      says: "Welcome to WHOA. Want to see what we have?",
      does: { kind: "shop" },
    },
    { x: 4, y: 6 },
  ),

  // Door (16,4). Not (14,4), which is where I first wrote it and
  // which would have spat you out two squares away from the door you
  // had just come through, in the middle of the path.
  events: room(
    "events",
    PLAIN_ROOM,
    {
      name: "Door staff",
      says: "Something is on most weeks. Want the dates?",
      does: { kind: "link", href: "/events", label: "the events page" },
    },
    { x: 16, y: 5 },
  ),

  // Door (3,11).
  crew: room(
    "crew",
    PLAIN_ROOM,
    {
      name: "Crew lead",
      says: "Rep WHOA, earn on every sale. Want in?",
      does: { kind: "link", href: "/join", label: "joining the crew" },
    },
    { x: 3, y: 12 },
  ),

  // Door (15,11). The real shop, so the real catalogue.
  whoadega: room(
    "whoadega",
    SHOP_ROOM,
    {
      name: "WHOADEGA staff",
      says: "Everything on the shelves is real. Have a look?",
      does: { kind: "shop" },
    },
    { x: 15, y: 12 },
  ),

  // Door (10,13).
  lab: room(
    "lab",
    PLAIN_ROOM,
    {
      name: "The professor",
      says: "Ah, there you are. I have a card with your name on it.",
      does: { kind: "link", href: "/whoa-card", label: "the WHOA card" },
    },
    { x: 10, y: 14 },
  ),
};

/* ───── Reading a map ───── */

const WALKABLE_OUT = new Set([".", ",", "f", "t"]);
const WALKABLE_IN = new Set(["_", "M"]);

export function sceneAt(sceneId: string): Scene {
  return SCENES[sceneId] ?? SCENES.town;
}

export function tileAt(scene: Scene, x: number, y: number): string {
  const row = scene.map[y];
  if (!row) return scene.kind === "indoor" ? "|" : "T";
  const t = row[x];
  return t ?? (scene.kind === "indoor" ? "|" : "T");
}

export function canStandOn(scene: Scene, x: number, y: number): boolean {
  const t = tileAt(scene, x, y);
  if (scene.npc && scene.npc.x === x && scene.npc.y === y) return false;
  if (scene.kind === "indoor") return WALKABLE_IN.has(t);
  // A door is walkable: you step onto it and you are inside.
  return WALKABLE_OUT.has(t) || t in DOORS;
}

export function colsOf(scene: Scene): number {
  return scene.map[0].length;
}
export function rowsOf(scene: Scene): number {
  return scene.map.length;
}
