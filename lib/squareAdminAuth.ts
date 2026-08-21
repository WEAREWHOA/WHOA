// Guards the one-time Square setup endpoints (webhook registration,
// backfill). These aren't meant to be hit repeatedly or by end users, so a
// single shared secret is enough — there's no session/user concept that
// makes sense for a one-off admin action like this.
export function checkAdminSecret(req: Request): boolean {
  const secret = process.env.SQUARE_ADMIN_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
