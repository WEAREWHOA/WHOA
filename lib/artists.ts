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
    bio: "Marigold hand-weaves wall hangings and wearable pieces from deadstock yarn and thrifted fabric scraps, dyed in small batches in her backyard. Every piece is one-of-one — if it sells, it's gone for good.",
    medium: "Textile & fiber art",
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
        medium: "Wearable fiber piece, one size",
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
];

export function getArtist(slug: string) {
  return ARTISTS.find((artist) => artist.slug === slug);
}
