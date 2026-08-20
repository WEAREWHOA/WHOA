export const MEDIUM_CATEGORIES = [
  "Painting",
  "Prints",
  "Clothing",
  "Handmade Goods",
  "Jewelry",
  "Accessories",
  "Hats",
  "Ceramics",
] as const;

export type MediumCategory = (typeof MEDIUM_CATEGORIES)[number];

export interface ArtworkPiece {
  id: string;
  title: string;
  medium: string;
  blurb: string;
  price: string;
}

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
  instagram: string;
  pieces: ArtworkPiece[];
}

export const ARTISTS: Artist[] = [
  {
    slug: "nova-bloom",
    name: "Nova Bloom",
    tagline: "Digital collage that glitches between dream and static",
    bio: "Nova builds layered digital collages out of scanned flowers, old family photos, and hand-drawn textures, then runs them through glitch passes until they feel like a memory you're not sure is yours. Based in San Diego, showing at WHOA Wednesdays since day one.",
    medium: "Digital collage",
    category: "Prints",
    accent: "#ff2fb0",
    gradient: ["#2a0a3a", "#7b2ff7", "#ff2fb0"],
    rotate: -3,
    patternSeed: 0,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "bloom-01",
        title: "Static Garden",
        medium: "Archival print, 18×24",
        blurb: "A backyard rosebush dissolving into television snow.",
        price: "$180",
      },
      {
        id: "bloom-02",
        title: "Dial Tone Bouquet",
        medium: "Archival print, 12×16",
        blurb: "Wildflowers pressed between two dead radio frequencies.",
        price: "$110",
      },
      {
        id: "bloom-03",
        title: "Family VHS No. 4",
        medium: "Archival print, 24×36",
        blurb: "A birthday party nobody quite remembers correctly.",
        price: "$240",
      },
    ],
  },
  {
    slug: "ricochet",
    name: "Ricochet",
    tagline: "Aerosol murals built for movement and bass",
    bio: "Ricochet paints big — murals, box trucks, stage backdrops — built to read from across a festival field. Heavy on motion lines, spray cans, and color that fights back against the desert sun. You've probably danced in front of one of these without knowing it.",
    medium: "Spray paint & murals",
    category: "Painting",
    accent: "#29e6ff",
    gradient: ["#0a2a1f", "#1a6b4a", "#29e6ff"],
    rotate: 2,
    patternSeed: 1,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "ric-01",
        title: "Ride the Bass Out",
        medium: "Spray paint on canvas, 36×48",
        blurb: "Originally painted live behind the DJ booth at Bayfest.",
        price: "$650",
      },
      {
        id: "ric-02",
        title: "Whoadega Sign Study",
        medium: "Spray paint on wood panel, 24×24",
        blurb: "A sketch for the booth mural, framed and finished.",
        price: "$220",
      },
      {
        id: "ric-03",
        title: "Night Shift",
        medium: "Spray paint on canvas, 30×40",
        blurb: "The crew loading out at 2am, rendered in neon.",
        price: "$480",
      },
    ],
  },
  {
    slug: "marigold-static",
    name: "Marigold Static",
    tagline: "Woven textiles for people who dance barefoot",
    bio: "Marigold hand-weaves wall hangings and one-off pieces from deadstock yarn and thrifted fabric scraps, dyed in small batches in her backyard. Every piece is one-of-one — if it sells, it's gone for good.",
    medium: "Textile & fiber art",
    category: "Handmade Goods",
    accent: "#baff29",
    gradient: ["#0d3b3b", "#1a8a6b", "#baff29"],
    rotate: -4,
    patternSeed: 2,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "mari-01",
        title: "Sunroom Tapestry",
        medium: "Hand-woven wall hanging, 3×4 ft",
        blurb: "Warm yellows and rust, woven over a slow week of sun.",
        price: "$310",
      },
      {
        id: "mari-02",
        title: "Ceremony Wrap",
        medium: "Woven fiber piece, one size",
        blurb: "A festival cape doubling as a picnic blanket at 3am.",
        price: "$150",
      },
    ],
  },
  {
    slug: "salt-and-ember",
    name: "Salt & Ember",
    tagline: "Sculptural ceramics fired in small batches",
    bio: "Salt & Ember is a two-person ceramics studio throwing functional and sculptural pieces in a backyard kiln. Expect uneven glazes, hand-carved textures, and the occasional piece that came out of the fire looking nothing like it went in.",
    medium: "Ceramics & sculpture",
    category: "Ceramics",
    accent: "#ff8a29",
    gradient: ["#c97a2f", "#e0a94e", "#ff8a29"],
    rotate: 3,
    patternSeed: 3,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "salt-01",
        title: "Ash Glaze Vessel",
        medium: "Stoneware, 10in tall",
        blurb: "Wood-fired with a drip glaze that never repeats twice.",
        price: "$140",
      },
      {
        id: "salt-02",
        title: "WHOADEGA Mug, Set of 2",
        medium: "Stoneware, hand-thrown",
        blurb: "Made for the booth's morning-coffee crew.",
        price: "$68",
      },
      {
        id: "salt-03",
        title: "Ember Totem",
        medium: "Sculptural stoneware, 16in",
        blurb: "A tabletop totem carved with festival-gate motifs.",
        price: "$260",
      },
    ],
  },
  {
    slug: "petal-and-bone",
    name: "Petal & Bone",
    tagline: "Wire-wrapped jewelry made for late nights",
    bio: "Petal & Bone hand-wraps copper wire and stone beads into jewelry built to survive a full weekend outside — statement earrings, stackable rings, and the kind of necklace that ends up in every photo from the night.",
    medium: "Wire-wrapped & beaded jewelry",
    category: "Jewelry",
    accent: "#7b2ff7",
    gradient: ["#1a0a2e", "#4a1a6b", "#7b2ff7"],
    rotate: 4,
    patternSeed: 1,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "petal-01",
        title: "Moonstone Wrap Ring",
        medium: "Wire-wrapped ring, adjustable",
        blurb: "A single moonstone caged in hand-bent copper.",
        price: "$45",
      },
      {
        id: "petal-02",
        title: "Sunset Drop Earrings",
        medium: "Beaded dangle earrings",
        blurb: "Ombré glass beads that catch every stage light.",
        price: "$38",
      },
      {
        id: "petal-03",
        title: "Constellation Choker",
        medium: "Hand-strung beaded choker",
        blurb: "Tiny brass stars strung on waxed cord.",
        price: "$52",
      },
    ],
  },
  {
    slug: "loose-thread-collective",
    name: "Loose Thread Collective",
    tagline: "Upcycled festival apparel, one seam at a time",
    bio: "Loose Thread Collective takes thrifted and deadstock clothing apart and puts it back together — patchwork jackets, hand-dyed tees, and one-off pants nobody else will be wearing at the booth.",
    medium: "Upcycled apparel",
    category: "Clothing",
    accent: "#fff229",
    gradient: ["#3a3a0a", "#8a8a1a", "#fff229"],
    rotate: -2,
    patternSeed: 2,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "loose-01",
        title: "Patchwork Festival Jacket",
        medium: "Upcycled denim, one of one",
        blurb: "Built from three thrifted jackets and a lot of patience.",
        price: "$140",
      },
      {
        id: "loose-02",
        title: "Tie-Dye Crew Tee",
        medium: "Hand-dyed cotton, S–XL",
        blurb: "No two dye jobs ever come out the same.",
        price: "$42",
      },
      {
        id: "loose-03",
        title: "Cargo Pants, Reworked",
        medium: "Upcycled workwear",
        blurb: "Extra pockets added for glow sticks and snacks.",
        price: "$78",
      },
    ],
  },
  {
    slug: "sunbaked-studio",
    name: "Sunbaked Studio",
    tagline: "The small stuff you actually reach for all day",
    bio: "Sunbaked Studio makes the accessories you actually use at a festival — woven totes, sunglasses chains, and belts built for dust and dancing, not a boardroom.",
    medium: "Handmade accessories",
    category: "Accessories",
    accent: "#ff2f1a",
    gradient: ["#3a0a05", "#8a2a15", "#ff2f1a"],
    rotate: -5,
    patternSeed: 3,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "sun-01",
        title: "Woven Straw Tote",
        medium: "Hand-woven tote bag",
        blurb: "Big enough for a water bottle, a jacket, and snacks.",
        price: "$58",
      },
      {
        id: "sun-02",
        title: "Beaded Sunglasses Chain",
        medium: "Hand-beaded chain",
        blurb: "So your sunglasses survive the whole set.",
        price: "$24",
      },
      {
        id: "sun-03",
        title: "Studded Festival Belt",
        medium: "Leather, adjustable",
        blurb: "Hand-studded in a backyard, one belt at a time.",
        price: "$65",
      },
    ],
  },
  {
    slug: "wildbrim",
    name: "Wildbrim",
    tagline: "Handmade hats built for sun, dust, and dancing",
    bio: "Wildbrim hand-blocks and crochets hats built to survive a three-day festival. Every hat is made to order in small batches, so what's on the table is what exists.",
    medium: "Handmade hats",
    category: "Hats",
    accent: "#ffffff",
    gradient: ["#1a1a1a", "#4a4a4a", "#ffffff"],
    rotate: 5,
    patternSeed: 0,
    instagram: "https://instagram.com",
    pieces: [
      {
        id: "wild-01",
        title: "Crochet Bucket Hat",
        medium: "Hand-crocheted, one size",
        blurb: "Packs flat, survives a backpack for three days straight.",
        price: "$48",
      },
      {
        id: "wild-02",
        title: "Wide Brim Sun Hat",
        medium: "Hand-blocked straw, packable",
        blurb: "Real shade for the peak-heat set.",
        price: "$72",
      },
      {
        id: "wild-03",
        title: "Patchwork Trucker Cap",
        medium: "Upcycled fabric panels",
        blurb: "No two panels are ever cut from the same scrap.",
        price: "$36",
      },
    ],
  },
];

export function getArtist(slug: string) {
  return ARTISTS.find((artist) => artist.slug === slug);
}
