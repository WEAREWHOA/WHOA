import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { issueClaims, openClaims } from "@/lib/wallet";

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
 *
 * Two kinds of code, and the body says which:
 *
 *   { card: true }                    a card sold over the counter.
 *                                     Membership, no credit.
 *   { valueCents: 5000 }              fifty dollars onto a balance.
 *                                     Credit, no membership.
 *   { card: true, valueCents: 5000 }  both, in one code, for a card
 *                                     bought and loaded at once.
 *
 * The price of the card is deliberately not a default for valueCents.
 * The ten dollars is what the card costs, not what goes on it, and
 * wiring the price in here is exactly how it came to mean both.
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
  const card = Boolean(body.card);
  // Zero unless asked for. A card code carries no credit, so the
  // common case for card: true is no value at all.
  const valueCents = Number(body.valueCents ?? 0);

  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return Response.json({ error: "count must be between 1 and 200" }, { status: 400 });
  }
  if (!Number.isInteger(valueCents) || valueCents < 0) {
    return Response.json(
      { error: "valueCents must be a whole number of cents, zero or more" },
      { status: 400 },
    );
  }
  // Refused rather than quietly minted, because this one would be
  // handed over in exchange for money and would then do nothing.
  if (valueCents === 0 && !card) {
    return Response.json(
      {
        error:
          "A code has to do something: pass card: true for a membership code, " +
          "valueCents for a credit code, or both.",
      },
      { status: 400 },
    );
  }

  try {
    const claims = await issueClaims({
      count,
      valueCents,
      grantsMembership: card,
      issuedBy: "admin-api",
      note: body.note?.slice(0, 200) ?? null,
    });

    return Response.json(
      {
        issued: claims.length,
        valueCents,
        grantsMembership: card,
        // Said back plainly, because the difference between the two
        // kinds of code is one word in the request and ten dollars of
        // confusion at the counter.
        kind:
          card && valueCents > 0
            ? "WHOA card plus credit"
            : card
            ? "WHOA card membership, no credit"
            : "Store credit, no membership",
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
