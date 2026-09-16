import type { Product } from "./types";

/**
 * Readable product URLs: /shop/whoa-flow-sweatpants instead of
 * /shop/IT2ZAR44JDOXVAKDVDV3CDBG.
 *
 * Square's catalog ids are the only permanent handle a product has, so
 * they stay the fallback and keep resolving forever — nothing that's been
 * indexed, printed on a card or pasted into a DM ever 404s. The slug is
 * what the site links to and what search engines are told is canonical.
 */

/** Cap so a rambling Square product name can't produce a 300-character URL. */
const MAX_SLUG_LENGTH = 60;

/**
 * Turns a product name into a URL segment.
 *
 * Normalises accents away rather than percent-encoding them (a URL full of
 * %C3%A9 is no more readable than an id), drops anything that isn't a
 * letter, digit or space, and collapses the rest to single hyphens. Cuts
 * at a word boundary where it can, so a truncated slug doesn't end
 * mid-word.
 */
export function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= MAX_SLUG_LENGTH) return base;

  const cut = base.slice(0, MAX_SLUG_LENGTH);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen > MAX_SLUG_LENGTH / 2 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

export interface SlugIndex {
  /** slug -> product. */
  bySlug: Map<string, Product>;
  /** Square id -> the slug that product is canonically served at. */
  slugById: Map<string, string>;
}

/**
 * Assigns every product a unique slug.
 *
 * Built across the whole catalog rather than per-product because
 * uniqueness is a property of the set: two items both called "Tie Dye
 * Hoodie" can't share a URL. On a collision the loser keeps its name and
 * gains a short piece of its own id.
 *
 * Products are sorted by id first so the assignment is *stable*: Square
 * doesn't promise the order it returns a catalog in, and without this the
 * same two items could swap which one owns the clean slug between two
 * requests — silently changing a live URL, which is the one thing slugs
 * must never do.
 *
 * A product whose name slugifies to nothing (emoji-only, say) falls back
 * to its id, which is always a valid segment.
 */
export function buildSlugIndex(products: Product[]): SlugIndex {
  const bySlug = new Map<string, Product>();
  const slugById = new Map<string, string>();

  for (const product of [...products].sort((a, b) => a.id.localeCompare(b.id))) {
    const base = slugify(product.name) || product.id.toLowerCase();
    let slug = base;
    if (bySlug.has(slug)) slug = `${base}-${product.id.toLowerCase().slice(0, 6)}`;
    // Still taken (same name *and* the same id prefix) — fall back to the
    // id, which is unique by definition.
    if (bySlug.has(slug)) slug = product.id.toLowerCase();

    bySlug.set(slug, product);
    slugById.set(product.id, slug);
  }

  return { bySlug, slugById };
}

/**
 * Square catalog ids are 20+ characters of uppercase base32. Used only to
 * decide whether a URL segment that matched no slug is worth a catalog
 * lookup, so a miss costs nothing and a false positive just 404s the way
 * it would have anyway.
 */
export function looksLikeSquareId(segment: string): boolean {
  return /^[A-Z0-9]{20,32}$/.test(segment);
}
