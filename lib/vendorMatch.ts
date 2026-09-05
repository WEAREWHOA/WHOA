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

export function matchVendorSlug(productName: string): string | undefined {
  for (const artist of VENDORS_BY_LENGTH) {
    if (matchesArtistName(productName, artist.name)) return artist.slug;
  }
  return undefined;
}
