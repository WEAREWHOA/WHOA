import { NextResponse, type NextRequest } from "next/server";
import { getLinkBySlug, recordLinkClick } from "@/lib/store";
import { REF_COOKIE, REF_COOKIE_DAYS } from "@/lib/attribution";

export async function GET(req: NextRequest, ctx: RouteContext<"/r/[slug]">) {
  const { slug } = await ctx.params;

  // This is a public link real customers click, often from a printed flyer
  // or social bio — a transient Supabase hiccup should never show them a
  // broken page. Log it and fall back to a plain /shop redirect (losing
  // just the referral attribution for that one click) rather than 500ing.
  let link: Awaited<ReturnType<typeof getLinkBySlug>>;
  try {
    link = await getLinkBySlug(slug);
  } catch (err) {
    console.error("getLinkBySlug failed:", err);
    return NextResponse.redirect(new URL("/shop", req.url), 302);
  }

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
