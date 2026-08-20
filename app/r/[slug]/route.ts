import { NextResponse, type NextRequest } from "next/server";
import { getLinkBySlug, recordLinkClick } from "@/lib/store";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/attribution";

export async function GET(req: NextRequest, ctx: RouteContext<"/r/[slug]">) {
  const { slug } = await ctx.params;
  const link = await getLinkBySlug(slug);

  if (!link) {
    return NextResponse.redirect(new URL("/shop", req.url), 302);
  }

  await recordLinkClick(link.slug);

  const response = NextResponse.redirect(
    new URL(`/shop?tag=${encodeURIComponent(link.slug)}`, req.url),
    302,
  );

  response.cookies.set(REF_COOKIE, link.ambassadorCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: REF_COOKIE_DAYS * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
