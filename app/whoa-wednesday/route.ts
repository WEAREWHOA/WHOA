import { NextResponse, type NextRequest } from "next/server";
import { getNextWhoaWednesday } from "@/lib/whoaWednesday";

/**
 * /whoa-wednesday — always the next one.
 *
 * The address that goes on a flyer, on /go and above the calendar, and
 * keeps working after tonight. It resolves the next date on every
 * request and forwards to that event's own page, so nothing has to be
 * edited the morning after a Wednesday.
 *
 * 307 and not 308, deliberately. A permanent redirect is cached by
 * browsers and by anything in front of this, which would pin the link
 * to one week's page for everybody who had already followed it -- the
 * exact failure this exists to prevent. The same reasoning rules out
 * caching the response at all.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const next = await getNextWhoaWednesday().catch((err) => {
    console.error("Couldn't resolve the next WHOA Wednesday:", err);
    return undefined;
  });

  // Nothing scheduled, or the calendar could not be read: the WHOAdega
  // filter is the honest answer rather than a dead end, and it is where
  // the next one will appear when it is announced.
  const destination = next
    ? `/events/${encodeURIComponent(next.id)}`
    : "/events?category=whoadega";

  return NextResponse.redirect(new URL(destination, req.url), 307);
}
