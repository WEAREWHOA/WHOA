import { NextResponse, type NextRequest } from "next/server";
import { getByCode, recordClick } from "@/lib/store";
import { STOREFRONT_URL } from "@/lib/site";

export async function GET(_req: NextRequest, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const ambassador = await getByCode(code);

  if (!ambassador) {
    return NextResponse.redirect(STOREFRONT_URL, 302);
  }

  await recordClick(ambassador.code);

  const destination = new URL(STOREFRONT_URL);
  destination.searchParams.set("ref", ambassador.code);
  destination.searchParams.set("promo", ambassador.code);

  return NextResponse.redirect(destination.toString(), 302);
}
