export interface MysteryDrop {
  id: string;
  name: string;
  description: string;
  rarity: "Common" | "Rare" | "1-of-1";
  accent: string;
  // Relative odds — higher weight is more likely. Not literal stock levels,
  // just the prize pool's rarity curve.
  weight: number;
}

// A curated prize pool standing in for real blind-box/upcycled inventory —
// not live-linked to Square stock yet, so treat this as the announced
// pool for the box, not a live count of what's left.
export const MYSTERY_DROPS: MysteryDrop[] = [
  {
    id: "sticker-pack",
    name: "WHOADEGA Sticker Pack",
    description: "A handful of flame stickers for your board, bottle, or bumper.",
    rarity: "Common",
    accent: "#29e6ff",
    weight: 40,
  },
  {
    id: "tote",
    name: "Flame Tote Bag",
    description: "Canvas tote, screen-printed in-house.",
    rarity: "Common",
    accent: "#baff29",
    weight: 30,
  },
  {
    id: "tee",
    name: "WHOA Wednesday Tee",
    description: "A random size from the current run — no swaps.",
    rarity: "Rare",
    accent: "#ff8a29",
    weight: 15,
  },
  {
    id: "upcycled-jacket",
    name: "Upcycled Denim Jacket",
    description: "Hand-reworked, one of a small run — no two are exactly alike.",
    rarity: "Rare",
    accent: "#7b2ff7",
    weight: 10,
  },
  {
    id: "one-of-one",
    name: "1-of-1 Painted Piece",
    description: "A single hand-painted piece. When it's pulled, it's gone.",
    rarity: "1-of-1",
    accent: "#ff2fb0",
    weight: 5,
  },
];

export function pullMysteryDrop(): MysteryDrop {
  const total = MYSTERY_DROPS.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * total;
  for (const drop of MYSTERY_DROPS) {
    roll -= drop.weight;
    if (roll <= 0) return drop;
  }
  return MYSTERY_DROPS[MYSTERY_DROPS.length - 1];
}
