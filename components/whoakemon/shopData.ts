import "server-only";

import { listProducts } from "@/lib/catalog";

/**
 * The catalogue, trimmed to what fits on a Game Boy screen.
 *
 * The attendant hands over the real Square catalogue, not a copy of
 * it typed out somewhere: same products, same prices, same photos,
 * and the basket you fill is the site's own. A shop in a game that
 * does not actually sell anything is a diorama.
 *
 * Trimmed because the full Product carries option matrices, every
 * photo and a description that can run to paragraphs, none of which
 * survives a 350 pixel screen, and all of which would be shipped to
 * the browser to be thrown away.
 */

export interface GameVariation {
  id: string;
  name: string;
  priceCents: number;
}

export interface GameItem {
  id: string;
  name: string;
  /** One line. The dialogue box has room for one line. */
  blurb: string;
  imageUrl: string | null;
  slug: string;
  variations: GameVariation[];
  categories: string[];
}

export interface GameCatalogue {
  categories: string[];
  items: GameItem[];
  /** Null unless the catalogue could not be read at all. */
  error: string | null;
}

/** Enough to tell one item from another, short enough to read. */
function oneLine(description: string): string {
  const flat = description
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "";
  // The first sentence, or the first 110 characters at a word break,
  // whichever comes first.
  const stop = flat.search(/[.!?](\s|$)/);
  const first = stop > 0 && stop < 130 ? flat.slice(0, stop + 1) : flat;
  if (first.length <= 110) return first;
  return first.slice(0, first.lastIndexOf(" ", 110)).trimEnd() + "…";
}

export async function loadCatalogue(): Promise<GameCatalogue> {
  let products: Awaited<ReturnType<typeof listProducts>>;
  try {
    products = await listProducts({ onlineOnly: true });
  } catch (err) {
    // The town still works with the shop shut, which is better than
    // the page failing because Square is having a moment.
    console.error("Couldn't load the catalogue for WHOAkémon:", err);
    return { categories: [], items: [], error: "The shop is shut. Try the website." };
  }

  const items: GameItem[] = products
    .filter((p) => p.variations.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      blurb: oneLine(p.description ?? ""),
      imageUrl: p.imageUrl,
      slug: p.slug,
      variations: p.variations.map((v) => ({
        id: v.id,
        name: v.name,
        priceCents: v.priceCents,
      })),
      categories: p.categories.map((c) => c.name),
    }));

  // Categories in the order they first appear, which is Square's own
  // ordering rather than alphabetical: the shop has an opinion about
  // what comes first and it is worth keeping.
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const item of items) {
    for (const c of item.categories) {
      if (!seen.has(c)) {
        seen.add(c);
        categories.push(c);
      }
    }
  }

  return { categories, items, error: null };
}
