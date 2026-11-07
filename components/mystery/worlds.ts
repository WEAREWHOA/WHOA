/**
 * The map, laid out on the same grid the reference uses.
 *
 * Super Mario Bros. 3's world map is not a winding line through open
 * space, which is what I built before I had the picture in front of
 * me. It is a tile grid: roads run only horizontally and vertically,
 * they meet at right angles, and every level panel, house and castle
 * sits on a cell. Getting that wrong turns the whole thing into a
 * flowchart with grass on it.
 *
 * So everything here is in grid cells, 1-indexed, and the component
 * turns cells into percentages. One source of position for the nodes,
 * the roads and the scenery means a road always ends exactly on the
 * panel it leads to, rather than nearly.
 */

export const COLS = 16;
export const ROWS = 11;

export interface Stop {
  /** The number in the panel. Absent for the house, the castle and
   *  the start sign, which are not levels. */
  n?: number;
  href: string;
  /** The real destination, said plainly on the map. */
  page: string;
  /** The costume. */
  world: string;
  /** One line of what is actually there. */
  blurb: string;
  col: number;
  row: number;
  kind: "level" | "house" | "castle" | "start";
}

export const STOPS: Stop[] = [
  {
    href: "/",
    // The sign already says START in letters a foot high. A label
    // under it saying START as well is the same stutter as a planet
    // labelled "Coming soon" with "Coming Soon!" written underneath.
    page: "Homepage",
    world: "Back to the real one",
    blurb: "The homepage, as everybody else sees it.",
    col: 2,
    row: 4,
    kind: "start",
  },
  {
    n: 1,
    href: "/shop",
    page: "Shop",
    world: "Drip Land",
    blurb: "Everything we make, on the shelf.",
    col: 5,
    row: 2,
    kind: "level",
  },
  {
    n: 2,
    href: "/events",
    page: "Events",
    world: "Night Land",
    blurb: "What is on, and what is next.",
    col: 9,
    row: 2,
    kind: "level",
  },
  {
    n: 3,
    href: "/whoadega",
    page: "WHOADEGA",
    world: "Bodega Land",
    blurb: "The shop itself, on Ocean Beach.",
    col: 12,
    row: 2,
    kind: "level",
  },
  {
    n: 4,
    href: "/join",
    page: "Join",
    world: "Crew Land",
    blurb: "Rep WHOA, earn on every sale.",
    col: 12,
    row: 5,
    kind: "level",
  },
  {
    n: 5,
    href: "/whoa-map",
    page: "WHOA Map",
    world: "Pin Land",
    blurb: "Where WHOA has turned up, worldwide.",
    col: 5,
    row: 10,
    kind: "level",
  },
  {
    n: 6,
    href: "/about",
    page: "About",
    world: "Origin Land",
    blurb: "Who this is and why it exists.",
    col: 9,
    row: 10,
    kind: "level",
  },
  {
    href: "/whoa-card",
    page: "WHOA Card",
    world: "Card House",
    blurb: "Ten dollars of credit, and the perks.",
    col: 14,
    row: 5,
    kind: "house",
  },
  {
    href: "/portal",
    page: "Portal",
    world: "The Castle",
    blurb: "Your account: orders, wallet, everything.",
    col: 14,
    row: 8,
    kind: "castle",
  },
];

/**
 * The roads, as straight runs between two cells.
 *
 * Every pair shares a column or a row, which is checked in the
 * component rather than trusted: a diagonal here would silently draw
 * a box instead of a line, and on a map this busy nobody would spot
 * which one was wrong.
 */
export const ROADS: [[number, number], [number, number]][] = [
  [[2, 4], [5, 4]],
  [[5, 4], [5, 2]],
  [[5, 2], [9, 2]],
  [[9, 2], [12, 2]],
  [[12, 2], [12, 5]],
  [[12, 5], [14, 5]],
  [[5, 4], [5, 10]],
  [[5, 10], [9, 10]],
  [[9, 10], [14, 10]],
  [[14, 10], [14, 8]],
];

/**
 * Scenery.
 *
 * Dense on purpose. The first version of this map had a dozen props
 * on it and read as a flowchart in a yellow box: what makes the
 * reference a landscape is that the ground is covered, and the roads
 * are cut through something rather than drawn on nothing.
 *
 * Every cell here is checked against ROADS and STOPS by the test in
 * the scratchpad, because a bush sitting on a road is the one mistake
 * in this file nobody would notice by reading it.
 */
export const SCENERY: { kind: "bush" | "rock"; col: number; row: number }[] = [
  // The top band, above the first road.
  { kind: "bush", col: 2, row: 1 },
  { kind: "bush", col: 3, row: 1 },
  { kind: "bush", col: 4, row: 1 },
  { kind: "bush", col: 6, row: 1 },
  { kind: "bush", col: 7, row: 1 },
  { kind: "bush", col: 8, row: 1 },
  { kind: "bush", col: 10, row: 1 },
  { kind: "bush", col: 11, row: 1 },
  { kind: "bush", col: 13, row: 1 },
  { kind: "bush", col: 15, row: 1 },
  { kind: "bush", col: 16, row: 1 },

  // Either side of the long top road.
  { kind: "bush", col: 2, row: 2 },
  { kind: "bush", col: 3, row: 2 },
  { kind: "bush", col: 15, row: 2 },
  { kind: "bush", col: 16, row: 2 },

  { kind: "bush", col: 1, row: 3 },
  { kind: "bush", col: 2, row: 3 },
  { kind: "bush", col: 3, row: 3 },
  { kind: "bush", col: 7, row: 3 },
  { kind: "bush", col: 8, row: 3 },
  { kind: "bush", col: 9, row: 3 },
  { kind: "bush", col: 10, row: 3 },
  { kind: "bush", col: 15, row: 3 },
  { kind: "bush", col: 16, row: 3 },

  // The middle, which the start road cuts across.
  { kind: "bush", col: 7, row: 4 },
  { kind: "bush", col: 8, row: 4 },
  { kind: "bush", col: 9, row: 4 },
  { kind: "bush", col: 10, row: 4 },
  { kind: "bush", col: 15, row: 4 },
  { kind: "bush", col: 16, row: 4 },

  { kind: "bush", col: 1, row: 5 },
  { kind: "bush", col: 2, row: 5 },
  { kind: "bush", col: 3, row: 5 },
  { kind: "bush", col: 7, row: 5 },
  { kind: "bush", col: 8, row: 5 },
  { kind: "bush", col: 16, row: 5 },

  { kind: "bush", col: 2, row: 6 },
  { kind: "bush", col: 3, row: 6 },
  { kind: "bush", col: 7, row: 6 },
  { kind: "bush", col: 8, row: 6 },
  { kind: "bush", col: 9, row: 6 },
  { kind: "bush", col: 11, row: 6 },
  { kind: "bush", col: 12, row: 6 },
  { kind: "bush", col: 16, row: 6 },

  // Rock country, bottom left, as the reference has it.
  { kind: "rock", col: 1, row: 7 },
  { kind: "rock", col: 2, row: 7 },
  { kind: "bush", col: 8, row: 7 },
  { kind: "bush", col: 9, row: 7 },
  { kind: "bush", col: 12, row: 7 },
  { kind: "bush", col: 13, row: 7 },
  { kind: "bush", col: 16, row: 7 },

  { kind: "rock", col: 1, row: 8 },
  { kind: "rock", col: 2, row: 8 },
  { kind: "rock", col: 3, row: 8 },
  { kind: "bush", col: 7, row: 8 },
  { kind: "bush", col: 10, row: 8 },
  { kind: "bush", col: 11, row: 8 },
  { kind: "bush", col: 16, row: 8 },

  { kind: "rock", col: 1, row: 9 },
  { kind: "rock", col: 2, row: 9 },
  { kind: "rock", col: 3, row: 9 },
  { kind: "rock", col: 4, row: 9 },
  { kind: "bush", col: 7, row: 9 },
  { kind: "bush", col: 8, row: 9 },
  { kind: "bush", col: 11, row: 9 },
  { kind: "bush", col: 12, row: 9 },
  { kind: "bush", col: 16, row: 9 },

  { kind: "rock", col: 1, row: 10 },
  { kind: "rock", col: 2, row: 10 },
  { kind: "rock", col: 16, row: 10 },

  { kind: "rock", col: 1, row: 11 },
  { kind: "rock", col: 2, row: 11 },
  { kind: "rock", col: 3, row: 11 },
  { kind: "bush", col: 6, row: 11 },
  { kind: "bush", col: 7, row: 11 },
  { kind: "bush", col: 9, row: 11 },
  { kind: "bush", col: 10, row: 11 },
  { kind: "bush", col: 12, row: 11 },
  { kind: "bush", col: 13, row: 11 },
  { kind: "bush", col: 15, row: 11 },
  { kind: "bush", col: 16, row: 11 },
];
