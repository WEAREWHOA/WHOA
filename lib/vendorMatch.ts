import { ARTISTS } from "./artists";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Two conventions in use for attributing a Square product to an artist by
// name alone (no dedicated field for it):
// - Suffix, used by every product this app creates itself going forward
//   (Art Collective approvals — see buildSquareItemName in
//   lib/artCollective.ts): "<Product Name> - <Artist Name>".
// - Prefix + literal "ARTIST" marker, used by most existing consignment
//   items entered directly in Square by hand: "<Artist Name> ARTIST <Item
//   Name>" (e.g. "Alex Wilson ARTIST Tie Dye Hoodie"). The marker is
//   matched as a whole word after normalizing, so punctuation/casing
//   around it (underscores, all-caps, etc.) doesn't matter; the text
//   before it must match the artist name exactly, not just start with it.
export function matchesArtistName(productName: string, artistName: string): boolean {
  const normalizedProduct = normalize(productName);
  const normalizedArtist = normalize(artistName);
  if (!normalizedProduct || !normalizedArtist) return false;

  if (normalizedProduct.endsWith(normalizedArtist)) return true;

  const marker = normalizedProduct.match(/^(.*?)\bartist\b/);
  return marker !== null && marker[1].trim() === normalizedArtist;
}

// Longest name first, so a substring of another vendor's name can't win by
// accident on the suffix convention (e.g. "Sol Search" vs "Search").
const VENDORS_BY_LENGTH = [...ARTISTS].sort((a, b) => b.name.length - a.name.length);

// Products whose real, customer-facing name follows neither convention,
// attributed to their vendor by hand.
//
// The alternative would be renaming the item in Square to fit a
// convention, but these names are deliberate branding: "Whoady X Whoa" is
// what the collab is called, and "Whoady ARTIST Whoady X Whoa" is what
// shoppers would then see in the shop. Loosening the matcher to "product
// name starts with a vendor name" isn't safe either — short vendor names
// like Scarce, Noiice and Tafari would start swallowing unrelated items.
//
// Keys are normalized (lowercase, punctuation collapsed to spaces), and
// match either the whole product name or the start of it on a word
// boundary, so "Whoady X Whoa" and "Whoady X Whoa Tee" both land on the
// same vendor without needing a row each.
const PRODUCT_VENDOR_OVERRIDES: Record<string, string> = {
  "whoady x whoa": "whoady",
};

const KNOWN_SLUGS = new Set(ARTISTS.map((artist) => artist.slug));

export function matchVendorSlug(productName: string): string | undefined {
  const normalizedProduct = normalize(productName);

  for (const [prefix, slug] of Object.entries(PRODUCT_VENDOR_OVERRIDES)) {
    if (normalizedProduct !== prefix && !normalizedProduct.startsWith(`${prefix} `)) continue;
    // A typo'd slug here would attribute the product to a vendor who
    // doesn't exist, and it'd silently never show on anyone's dashboard —
    // so say so and fall through to the naming conventions instead.
    if (!KNOWN_SLUGS.has(slug)) {
      console.warn(`PRODUCT_VENDOR_OVERRIDES maps "${prefix}" to unknown vendor slug "${slug}"`);
      break;
    }
    return slug;
  }

  for (const artist of VENDORS_BY_LENGTH) {
    if (matchesArtistName(productName, artist.name)) return artist.slug;
  }
  return undefined;
}
