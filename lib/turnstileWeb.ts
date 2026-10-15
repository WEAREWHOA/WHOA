/**
 * The half of the Turnstile configuration the browser is allowed to see.
 *
 * Split out of lib/humanCheck.ts because that module reads next/headers
 * to pass the caller's IP to Cloudflare, which makes it server-only: a
 * client component importing the site key from there drags next/headers
 * into the browser bundle and fails the build. The same split as
 * lib/square.ts and lib/squareWeb.ts, for the same reason.
 *
 * Empty when unset, which is what keeps the widget from rendering until
 * the keys exist.
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
