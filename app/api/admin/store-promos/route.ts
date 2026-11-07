import { adminSecretFailure, adminUnauthorized } from "@/lib/squareAdminAuth";
import { createStorePromo, listStorePromos, setStorePromoActive } from "@/lib/storePromos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Store-wide sale codes.
 *
 * Behind the admin secret, like the other endpoints that change what
 * things cost. A code created here can take up to 100% off every
 * eligible item in the shop, so it is not something a portal session
 * should be able to mint.
 */
export async function POST(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  let body: {
    code?: string;
    percent?: number;
    label?: string;
    startsAt?: string;
    endsAt?: string;
    maxRedemptions?: number;
    note?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code) return Response.json({ error: "code is required" }, { status: 400 });
  if (body.percent == null) {
    return Response.json({ error: "percent is required" }, { status: 400 });
  }

  const result = await createStorePromo({
    code: body.code,
    percent: Number(body.percent),
    label: body.label ?? null,
    startsAt: body.startsAt ?? null,
    endsAt: body.endsAt ?? null,
    maxRedemptions: body.maxRedemptions == null ? null : Number(body.maxRedemptions),
    createdBy: "admin-api",
    note: body.note ?? null,
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 400 });

  return Response.json(
    {
      promo: result.promo,
      // Said on every creation, because it is the one thing about this
      // feature that is not obvious and the one most likely to cause a
      // "why did the ambassador not get paid" question later.
      note:
        "A customer with an ambassador code gets whichever discount is worth more. " +
        "The ambassador is credited with the sale and earns commission either way.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Every code, live or not, with how many times each has been used. */
export async function GET(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  try {
    return Response.json(
      { promos: await listStorePromos() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

/** Turn one off, or back on. The off switch for a code gone wrong. */
export async function PATCH(req: Request) {
  const auth = adminSecretFailure(req);
  if (auth.failure) return adminUnauthorized(auth);

  let body: { code?: string; active?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.code || typeof body.active !== "boolean") {
    return Response.json({ error: "code and active are required" }, { status: 400 });
  }

  try {
    await setStorePromoActive(body.code, body.active);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
