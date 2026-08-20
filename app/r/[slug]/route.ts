import { NextResponse, type NextRequest } from "next/server";
import { getLinkBySlug, recordLinkClick } from "@/lib/store";
import { STOREFRONT_URL } from "@/lib/site";

export async function GET(_req: NextRequest, ctx: RouteContext<"/r/[slug]">) {
  const { slug } = await ctx.params;
  const link = await getLinkBySlug(slug);

  if (!link) {
    return NextResponse.redirect(STOREFRONT_URL, 302);
  }

  await recordLinkClick(link.slug);

  const destination = new URL(STOREFRONT_URL);
  destination.searchParams.set("ref", link.ambassadorCode);
  destination.searchParams.set("promo", link.ambassadorCode);
  destination.searchParams.set("tag", link.slug);

  return NextResponse.redirect(destination.toString(), 302);
}
