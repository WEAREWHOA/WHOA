import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { issueClaims, openClaims } from "@/lib/wallet";
import { CARD_PRICE_CENTS } from "@/lib/whoaPerks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Codes for the till.
 *
 * POST issues a batch and returns them in the clear, ONCE. The
 * database keeps only their hashes, so a code not written down from
 * this response is gone and the money behind it with it. Whoever
 * calls this is responsible for getting them onto receipts and not
 * into a log.
 *
 * Behind the admin secret rather than a portal session because this
 * mints money. The same gate as the Square setup endpoints.
 */
export async function POST(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  let body: { count?: number; valueCents?: number; card?: boolean; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const count = Number(body.count ?? 1);
  // A metal card is always the same price, so asking for the value as
  // well would be two numbers that can disagree. Pass card: true and
  // the price comes from one place.
  const valueCents = body.card ? CARD_PRICE_CENTS : Number(body.valueCents ?? 0);

  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return Response.json({ error: "count must be between 1 and 200" }, { status: 400 });
  }
  if (!Number.isInteger(valueCents) || valueCents <= 0) {
    return Response.json(
      { error: "valueCents must be a positive whole number of cents, or pass card: true" },
      { status: 400 },
    );
  }

  try {
    const claims = await issueClaims({
      count,
      valueCents,
      grantsMembership: Boolean(body.card),
      issuedBy: "admin-api",
      note: body.note?.slice(0, 200) ?? null,
    });

    return Response.json(
      {
        issued: claims.length,
        valueCents,
        grantsMembership: Boolean(body.card),
        warning:
          "These codes are shown once. They are stored hashed and cannot be recovered or reprinted.",
        codes: claims.map((c) => c.code),
      },
      // Never cached, never stored by anything in between. This
      // response is the only copy of these codes that exists.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Issuing wallet claims failed:", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/** What has been handed out and not yet used. Last four only. */
export async function GET(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  try {
    return Response.json({ open: await openClaims() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
