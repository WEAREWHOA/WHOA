/**
 * Where to send somebody after they sign in or sign up.
 *
 * Sign-in has always landed on /portal, which is right when the portal
 * is what they came for and wrong when it is not: somebody who taps
 * "sign up" on /go has told you exactly where they were, and dropping
 * them into the dashboard instead loses the thing they were doing.
 *
 * VALIDATED, NOT TRUSTED. This value arrives in a query string and a
 * form field, so anybody can put anything in it. Taken at face value it
 * is an open redirect: a link to our own login page that bounces to
 * somebody else's site afterwards, with our domain in the part of the
 * URL people actually read. So only a path on this site is allowed --
 * one leading slash, and never "//host" or "/\host", which browsers
 * read as protocol-relative URLs to somewhere else entirely.
 */
export function safeReturnTo(value: unknown, fallback = "/portal"): string {
  if (typeof value !== "string") return fallback;

  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  // "//evil.com" and "/\evil.com" are both ways out of this site.
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  // A backslash anywhere early is the other half of that trick, and no
  // route here contains one.
  if (path.includes("\\")) return fallback;

  return path;
}
