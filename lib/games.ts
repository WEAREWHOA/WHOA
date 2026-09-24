export interface GameTile {
  id: string;
  title: string;
  tagline: string;
  accent: string;
  href?: string;
  status: "live" | "soon";
  // Overrides the default "Play now →" label, for a live tile that isn't
  // actually a playable game.
  ctaLabel?: string;
}

// Tiles without an href/live status are real, planned builds — marked
// "Coming soon" rather than linked, same honesty-over-fake-functionality
// posture used everywhere else in this app (the POS "Reports" tab, the
// dashboard's Music tab, etc.) until each one actually ships.
//
// This list is the whole of the games page: a game that isn't here isn't
// on it. Some routes under /games still exist without a tile — the QR
// scavenger hunt lives on in the SSBD experience, and the others are
// kept out of the way rather than deleted — so dropping a tile is how a
// game leaves the page.
export const GAME_TILES: GameTile[] = [
  {
    id: "incoming",
    title: "WHOA Incoming",
    tagline: "45 seconds, one ship, a sky full of incoming. Beat your best.",
    accent: "#ff7a00",
    href: "/games/incoming",
    status: "live",
  },
  {
    id: "snake",
    title: "WHOA Snake",
    tagline: "A paint line eating 1-of-1 drops. Ten unlocks a free sticker.",
    accent: "#ff2fb0",
    href: "/games/snake",
    status: "live",
  },
  {
    id: "beat-pad",
    title: "Beat Pad",
    tagline: "16 pads, tied into the Music Collective.",
    accent: "#ff3b3b",
    href: "/games/beat-pad",
    status: "live",
  },
  {
    id: "visualizer",
    title: "Visualizer",
    tagline: "Mic-reactive visuals for whatever's playing in the room.",
    accent: "#29e6ff",
    href: "/games/visualizer",
    status: "live",
  },
  {
    id: "whoa-puzzle",
    title: "WHOA Puzzle",
    tagline: "Slide the tiles into place. It only says WHOA when you solve it.",
    accent: "#ff8a29",
    href: "/games/whoa-puzzle",
    status: "live",
  },
];
