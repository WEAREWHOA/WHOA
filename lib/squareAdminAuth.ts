import { timingSafeEqual } from "node:crypto";

/**
 * Guards the one-time Square setup endpoints (webhook registration,
 * backfill, catalog debug, vendor linking). These aren't meant to be hit
 * repeatedly or by end users, so a single shared secret is enough: there's
 * no session/user concept that makes sense for a one-off admin action.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Why this says WHY it failed.
 *
 * It used to return a bare boolean, so every route answered a plain 401
 * and there was no way to tell the two causes apart from outside:
 *
 *   the secret is not set on the deployment at all, so nothing anybody
 *   pastes can ever work
 *
 *   the secret is set and what was sent does not match it
 *
 * Those need completely different fixes, and guessing between them costs
 * a redeploy each time. Naming which one happened leaks nothing useful:
 * when it is not configured the endpoint refuses everybody anyway, so
 * saying so hands an attacker a door that is still shut.
 * ───────────────────────────────────────────────────────────────────────
 */
export type AdminAuthFailure = "not_configured" | "missing_header" | "mismatch";

export const ADMIN_AUTH_MESSAGES: Record<AdminAuthFailure, string> = {
  not_configured:
    "SQUARE_ADMIN_SECRET is not set on this deployment, so this endpoint refuses every " +
    "request. Set it in Vercel for the Production environment, then redeploy: an " +
    "environment variable added after a build is not visible to that build.",
  missing_header:
    "No Authorization header was sent. This endpoint expects 'Authorization: Bearer " +
    "<SQUARE_ADMIN_SECRET>'.",
  mismatch:
    "The secret sent does not match SQUARE_ADMIN_SECRET on this deployment. Check it is " +
    "set for the Production environment specifically, that the value has no trailing " +
    "newline or quotes, and that the deployment was rebuilt after it was last changed.",
};

/**
 * Constant-time compare, so the response time cannot be used to recover
 * the secret a character at a time. Lengths are compared first because
 * timingSafeEqual throws on a length mismatch, and the length of a secret
 * is not the part worth protecting.
 */
function secretsMatch(sent: string, expected: string): boolean {
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Which check failed, or null when the request is authorised. */
export function adminSecretFailure(req: Request): AdminAuthFailure | null {
  // Trimmed, because the overwhelmingly common way this goes wrong is a
  // value pasted into a dashboard with a trailing newline on it. A shared
  // secret whose edges are whitespace is not meaningfully stronger for
  // keeping them, and the failure it causes is invisible from both ends.
  const secret = process.env.SQUARE_ADMIN_SECRET?.trim();
  if (!secret) return "not_configured";

  const header = req.headers.get("authorization")?.trim();
  if (!header) return "missing_header";

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) return "mismatch";
  return secretsMatch(header.slice(prefix.length).trim(), secret) ? null : "mismatch";
}

/** The 401 every guarded route returns, with the reason in the body. */
export function adminUnauthorized(failure: AdminAuthFailure): Response {
  return Response.json(
    { error: "Unauthorized", reason: failure, detail: ADMIN_AUTH_MESSAGES[failure] },
    { status: 401 },
  );
}
