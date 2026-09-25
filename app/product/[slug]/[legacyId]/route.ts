import { NextResponse, type NextRequest } from "next/server";
import { resolveProduct } from "@/lib/catalog";
import { slugify } from "@/lib/productSlug";

/**
 * Square Online product URLs: /product/<slug>/<catalog-id>.
 *
 * These used to be a blanket 301 to /shop, on the reasoning that the ids
 * belonged to a previous platform. That turned out to be wrong for most
 * of them: Square Online and this site are both backed by the same Square
 * catalog, so the id in the old URL is usually the *current* catalog
 * object id and resolves to the exact product.
 *
 * The id is what's trusted, not the slug. The same product appears in
 * Google's index under several spellings — fuck-ice-crop, f-ck-ice-crop
 * and fck-ice-crop all carry id FABSRMV5LL6LC5WMXFSTBJDY — so matching on
 * the slug would scatter one product across three answers while the id
 * gives one.
 *
 * Resolved straight to the canonical /shop/<slug> rather than to the id
 * form, so an old link costs one redirect instead of two.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/product/[slug]/[legacyId]">) {
  const { slug, legacyId } = await ctx.params;
  return NextResponse.redirect(new URL(await destinationFor(legacyId, slug), req.url), 301);
}

export async function destinationFor(legacyId: string, slug?: string): Promise<string> {
  try {
    // The id first: it's unambiguous, and it's the same catalog.
    const byId = await resolveProduct(decodeURIComponent(legacyId));
    if (byId) return `/shop/${byId.product.slug}`;

    // Then the name buried in the URL, for the rows whose id came from
    // the older platform (the short numeric ones) rather than Square.
    if (slug) {
      const clean = decodeURIComponent(slug);
      const bySlug = (await resolveProduct(clean)) ?? (await resolveProduct(slugify(clean)));
      if (bySlug) return `/shop/${bySlug.product.slug}`;
    }
  } catch (err) {
    // Square being unreachable is not a reason to strand someone on an
    // error page — the shop is always a valid answer for a shop link.
    console.error(`Legacy product redirect failed for ${legacyId}:`, err);
  }

  return "/shop";
}
