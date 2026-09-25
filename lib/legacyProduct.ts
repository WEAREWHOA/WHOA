import { resolveProduct } from "./catalog";
import { slugify } from "./productSlug";

/**
 * Where an old Square Online product URL should go.
 *
 * Returns the canonical /shop/<slug> when the product still exists, and
 * null when it doesn't — null means 404, not "send them to the shop".
 *
 * That distinction is the whole point. Redirecting a dead product to the
 * shop index is exactly what Google calls a soft 404: the URL answers
 * 200 with a page that isn't what was asked for, so it stays in the index
 * competing with real pages. A gone product should say gone. The 404 page
 * links to the shop, so a person who clicked an old link still has
 * somewhere to go — they just get there without teaching Google that
 * every dead URL is secretly the shop.
 */
export async function legacyProductDestination(
  legacyId: string,
  slug?: string,
): Promise<string | null> {
  try {
    // The id first: it's unambiguous. Google indexed the same product
    // under several spellings — fuck-ice-crop, f-ck-ice-crop and
    // fck-ice-crop all carry FABSRMV5LL6LC5WMXFSTBJDY — so matching on
    // the name would scatter one product across three answers.
    const byId = await resolveProduct(decodeURIComponent(legacyId));
    if (byId) return `/shop/${byId.product.slug}`;

    // Then the name buried in the URL, for the rows whose id came from
    // the older platform (the short numeric ones) rather than Square.
    if (slug) {
      const clean = decodeURIComponent(slug);
      const bySlug = (await resolveProduct(clean)) ?? (await resolveProduct(slugify(clean)));
      if (bySlug) return `/shop/${bySlug.product.slug}`;
    }

    return null;
  } catch (err) {
    // Square being unreachable is different from the product being gone.
    // A 404 here would tell Google a live product no longer exists on the
    // strength of a timeout, so this one does fall back to the shop.
    console.error(`Legacy product lookup failed for ${legacyId}:`, err);
    return "/shop";
  }
}
