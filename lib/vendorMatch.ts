import { ARTISTS } from "./artists";

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Vendor names live at the end of each Square product's title (e.g. "Tie
// Dye Hoodie - WHOADY"), not in a dedicated field. Matches by checking
// whether the normalized product name ends with a normalized vendor name —
// longest name first, so a substring of another vendor's name can't win by
// accident (e.g. "Sol Search" vs "Search").
const VENDORS_BY_LENGTH = [...ARTISTS].sort((a, b) => b.name.length - a.name.length);

export function matchVendorSlug(productName: string): string | undefined {
  const normalizedProduct = normalize(productName);
  if (!normalizedProduct) return undefined;

  for (const artist of VENDORS_BY_LENGTH) {
    const normalizedVendor = normalize(artist.name);
    if (normalizedVendor && normalizedProduct.endsWith(normalizedVendor)) {
      return artist.slug;
    }
  }

  return undefined;
}
