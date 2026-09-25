import { NextResponse, type NextRequest } from "next/server";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { recordPageView } from "@/lib/pageViews";

/**
 * The traffic beacon. One POST per page view, fired from the browser.
 *
 * Everything that identifies the view is read here from the request —
 * user agent, edge country, and the signed-in account from the session
 * cookie — rather than trusted from the body, which anyone can write.
 * The body carries only the path, the per-tab session id and the
 * referrer.
 *
 * Always answers 204, even when the insert fails. A page must never break
 * because analytics did, and a beacon has nobody to report an error to.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      path?: unknown;
      sessionId?: unknown;
      referrer?: unknown;
      utmSource?: unknown;
      utmMedium?: unknown;
      utmCampaign?: unknown;
      isEntry?: unknown;
    };

    if (typeof body.path !== "string" || typeof body.sessionId !== "string") {
      return new NextResponse(null, { status: 204 });
    }

    const accountCode = await getSessionAmbassadorCode().catch(() => null);

    await recordPageView({
      path: body.path,
      sessionId: body.sessionId,
      accountCode,
      referrer: typeof body.referrer === "string" ? body.referrer : null,
      utmSource: typeof body.utmSource === "string" ? body.utmSource : null,
      utmMedium: typeof body.utmMedium === "string" ? body.utmMedium : null,
      utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign : null,
      isEntry: body.isEntry === true,
      userAgent: req.headers.get("user-agent"),
      // Set by the CDN edge. Absent in local development, which is fine —
      // country is a nice-to-have, not a key.
      country: req.headers.get("x-vercel-ip-country"),
    });
  } catch (err) {
    console.error("Traffic beacon failed:", err);
  }

  return new NextResponse(null, { status: 204 });
}
