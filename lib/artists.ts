export const MEDIUM_CATEGORIES = [
  "Painting",
  "Prints",
  "Clothing",
  "Handmade Goods",
  "Jewelry",
  "Accessories",
  "Hats",
  "Ceramics",
  "Vendor",
] as const;

export type MediumCategory = (typeof MEDIUM_CATEGORIES)[number];

export interface Artist {
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  medium: string;
  category: MediumCategory;
  accent: string;
  gradient: [string, string, string];
  rotate: number;
  patternSeed: number;
  instagram?: string;
}

// Visual palette cycled across vendors below — purely a styling choice, not
// tied to each brand's actual identity (we don't have real brand colors for
// most of these yet).
const PALETTE: { accent: string; gradient: [string, string, string] }[] = [
  { accent: "#ff2fb0", gradient: ["#2a0a3a", "#7b2ff7", "#ff2fb0"] },
  { accent: "#29e6ff", gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"] },
  { accent: "#baff29", gradient: ["#0d3b3b", "#1a8a6b", "#baff29"] },
  { accent: "#ff8a29", gradient: ["#c97a2f", "#e0a94e", "#ff8a29"] },
  { accent: "#7b2ff7", gradient: ["#1a0a2e", "#4a1a6b", "#7b2ff7"] },
  { accent: "#fff229", gradient: ["#3a3a0a", "#8a8a1a", "#fff229"] },
  { accent: "#ff2f1a", gradient: ["#3a0a05", "#8a2a15", "#ff2f1a"] },
  { accent: "#ffffff", gradient: ["#1a1a1a", "#4a4a4a", "#ffffff"] },
];

const ROTATES = [-4, 3, -2, 5, -5, 2, -3, 4];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\+/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Real WHOADEGA / online-store vendors. We only have names for now — bios,
// mediums, and real photos are pending. Product listings come live from
// Square via lib/vendor.ts (matched by vendor name), not hardcoded here.
// Keeping this copy generic and honest rather than inventing backstory for
// real people/brands.
const VENDOR_NAMES = [
  "Alex Wilson",
  "Ascension Society",
  "Barely Awake",
  "Chris Param",
  "Cosmic Braids",
  "End Of The 8",
  "Generic Pop",
  "Isabella Samaniego",
  "it's Not Taken",
  "Kava Coco",
  "Light & Sound Co",
  "Noiice",
  "PINS Nick NY",
  "Portal Pursuit",
  "Radiant Robes",
  "Rigamorte Vintage",
  "Sacred Imagination",
  "Scarce",
  "Shyning Sun",
  "Sol Search",
  "Vanilla Bean Facechain",
  "Tafari",
  "Vivid Visions",
  "Vulgar Goods",
  "Vzions Eve",
  "WHOADY",
  "Wook Plugs + Playa Wipes",
  "Youphoria",
];

export const ARTISTS: Artist[] = VENDOR_NAMES.map((name, i) => {
  const { accent, gradient } = PALETTE[i % PALETTE.length];
  return {
    slug: slugify(name),
    name,
    tagline: "WHOADEGA & online store vendor",
    bio: `Full profile coming soon. ${name} sells at the WHOADEGA and in the online store — both run on the same shop, so what's in stock here is what's on the shelf.`,
    medium: "WHOADEGA vendor",
    category: "Vendor",
    accent,
    gradient,
    rotate: ROTATES[i % ROTATES.length],
    patternSeed: i % 4,
  };
});

export function getArtist(slug: string) {
  return ARTISTS.find((artist) => artist.slug === slug);
}
