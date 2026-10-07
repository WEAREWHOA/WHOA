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
    "The secret sent does not match SQUARE_ADMIN_SECRET on this deployment. If the two " +
    "lengths below differ you are sending a different string; if they are equal it is the " +
    "same length but not the same value, which usually means the variable was changed in " +
    "Vercel after this deployment was built, so the running build still holds the old one.",
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

/**
 * Whitespace off both ends, then one matched pair of surrounding quotes.
 *
 * Both are things a dashboard does to a value without telling anybody: a
 * paste picks up a trailing newline, and a value typed as "abc123" is
 * stored with the quotes as part of it. Neither is visible from either
 * end of the request, and both produce the same unhelpful mismatch.
 *
 * Only a MATCHED pair is removed, so a secret that genuinely begins or
 * ends with a quote is left alone unless it does both.
 */
function clean(value: string): string {
  const trimmed = value.trim();
  const quoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")));
  return quoted ? trimmed.slice(1, -1).trim() : trimmed;
}

/**
 * What the two sides looked like, for the message. Lengths only, never
 * the values: comparing them separates "you are sending a different
 * string" from "same length, so the build is holding an older value",
 * which are the two things worth knowing and need opposite fixes.
 *
 * The length is already not the part being protected, since the compare
 * below has to check it before timingSafeEqual will accept the buffers.
 */
export interface AdminAuthDiagnostics {
  expectedLength: number;
  receivedLength: number;
}

export interface AdminAuthResult {
  failure: AdminAuthFailure | null;
  /** Set only on a mismatch. */
  lengths?: AdminAuthDiagnostics;
}

/**
 * Which check failed, or null when the request is authorised.
 *
 * The lengths come back WITH the answer rather than being stashed on the
 * module. Two requests can be in flight on one serverless instance, and a
 * shared slot would have them read each other's numbers, which is a
 * confusing lie to print in an error about confusion.
 */
export function adminSecretFailure(req: Request): AdminAuthResult {
  const secret = process.env.SQUARE_ADMIN_SECRET ? clean(process.env.SQUARE_ADMIN_SECRET) : "";
  if (!secret) return { failure: "not_configured" };

  const header = req.headers.get("authorization")?.trim();
  if (!header) return { failure: "missing_header" };

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return { failure: "mismatch", lengths: { expectedLength: secret.length, receivedLength: 0 } };
  }

  const sent = clean(header.slice(prefix.length));
  if (secretsMatch(sent, secret)) return { failure: null };

  return {
    failure: "mismatch",
    lengths: { expectedLength: secret.length, receivedLength: sent.length },
  };
}

/** The 401 every guarded route returns, with the reason in the body. */
export function adminUnauthorized({ failure, lengths }: AdminAuthResult): Response {
  if (!failure) throw new Error("adminUnauthorized called for an authorised request");
  return Response.json(
    {
      error: "Unauthorized",
      reason: failure,
      detail: lengths
        ? `${ADMIN_AUTH_MESSAGES[failure]} Expected ${lengths.expectedLength} characters, ` +
          `received ${lengths.receivedLength}.`
        : ADMIN_AUTH_MESSAGES[failure],
    },
    { status: 401 },
  );
}
