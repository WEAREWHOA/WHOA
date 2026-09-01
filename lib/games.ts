export interface GameTile {
  id: string;
  title: string;
  tagline: string;
  accent: string;
  href?: string;
  status: "live" | "soon";
}

// Tiles without an href/live status are real, planned builds — marked
// "Coming soon" rather than linked, same honesty-over-fake-functionality
// posture used everywhere else in this app (the POS "Reports" tab, the
// dashboard's Music tab, etc.) until each one actually ships.
export const GAME_TILES: GameTile[] = [
  {
    id: "snake",
    title: "WHOA Snake",
    tagline: "A paint line eating 1-of-1 drops. Beat the score, unlock a code.",
    accent: "#ff2fb0",
    href: "/games/snake",
    status: "live",
  },
  {
    id: "mystery-drop",
    title: "Mystery Drop Spinner",
    tagline: "Spin to reveal what's in the blind box.",
    accent: "#29e6ff",
    href: "/games/mystery-drop",
    status: "live",
  },
  {
    id: "quiz",
    title: "Which WHOA Piece Are You",
    tagline: "6 questions, one psychedelic result card built to share.",
    accent: "#baff29",
    href: "/games/quiz",
    status: "live",
  },
  {
    id: "graffiti",
    title: "Graffiti Wall",
    tagline: "Draw on the wall. It saves to the public gallery.",
    accent: "#ff7a00",
    href: "/games/graffiti",
    status: "live",
  },
  {
    id: "scavenger-hunt",
    title: "QR Scavenger Hunt",
    tagline: "Six hidden codes, one per WHOA branch. Find them all.",
    accent: "#fff229",
    status: "soon",
  },
  {
    id: "outfit-builder",
    title: "Outfit Builder",
    tagline: "Layer real WHOADEGA pieces. Screenshot your fit.",
    accent: "#7b2ff7",
    status: "soon",
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
    id: "arcade-cabinet",
    title: "WHOASIS Arcade Cabinet",
    tagline: "This whole page, running kiosk-mode in the lounge on real hardware.",
    accent: "#ffffff",
    status: "soon",
  },
];
