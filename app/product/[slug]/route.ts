import { NextResponse, type NextRequest } from "next/server";
import { destinationFor } from "./[legacyId]/route";

/** The one-segment form of the same old URL: /product/<slug>. */
export async function GET(req: NextRequest, ctx: RouteContext<"/product/[slug]">) {
  const { slug } = await ctx.params;
  // No id to trust here, so the name in the URL is all there is.
  return NextResponse.redirect(new URL(await destinationFor(slug, slug), req.url), 301);
}
