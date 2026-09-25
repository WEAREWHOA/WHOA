import type { NextConfig } from "next";

/**
 * Permanent redirects for URLs from the two shops that came before this one.
 *
 * Both are still indexed and still linked from the outside, so every one of
 * these is a live 404 until it's mapped. Ordering matters: Next matches
 * these top to bottom *before* filesystem routing, so a pattern that's too
 * greedy here silently shadows a real page.
 *
 * 301 rather than Next's default `permanent: true` (which emits 308). The
 * two are equivalent to Google, but 301 is what every older crawler,
 * link-checker and bookmark sync understands without argument, and these
 * links are old by definition.
 *
 * Old product URLs are the exception and are NOT here: they carry a
 * catalog id that usually still resolves, so they're handled by a route
 * that looks each one up and sends it to its actual product. See
 * app/product/[slug]/[legacyId]/route.ts.
 */
const legacyRedirects = [
  // --- Apex to www -----------------------------------------------------
  // Google crawled the apex copies of real product pages
  // (wearewhoa.art/shop/ocean-beach-whoa-hoodie and friends) and declined
  // to index them: same page, two hosts, so it picked one and binned the
  // rest. Without this the whole site exists twice and the crawl budget
  // is split between the copies.
  //
  // .well-known is excluded. Apple fetches the Apple Pay verification
  // file at the exact registered host and does not follow redirects —
  // www is registered today, so this would be harmless, but the day
  // anyone registers the apex instead, a redirect in front of that file
  // silently breaks Apple Pay.
  {
    source: "/:path((?!\\.well-known/).*)",
    has: [{ type: "host" as const, value: "wearewhoa.art" }],
    destination: "https://www.wearewhoa.art/:path",
    statusCode: 301,
  },

  // --- Square Online ---------------------------------------------------
  // Square Online serves its whole store under /s/. The explicit /s/shop
  // comes first for clarity; the catch-all covers /s/order, /s/cart and
  // anything else in that namespace.
  { source: "/s/shop", destination: "/shop", statusCode: 301 },
  { source: "/s/:path*", destination: "/shop", statusCode: 301 },

  // Square Online category pages: /shop/<category>/<catalog-id>.
  //
  // Written as two named segments, NOT /shop/:path*, because this site's
  // own product pages live at /shop/<itemId> — one segment. A greedy
  // pattern here would 301 every real product page into the shop index and
  // take the entire storefront down. Three segments only.
  { source: "/shop/:category/:legacyId", destination: "/shop", statusCode: 301 },

  // Square Online product pages (/product/<slug>/<catalog-id>) are NOT
  // here on purpose. They used to be a blanket 301 to /shop; they're now
  // handled by app/product/[slug]/[legacyId]/route.ts, which looks the id
  // up in the catalog and sends each one to its actual product. A rule
  // here would shadow that route entirely, since redirects run before
  // filesystem routing.

  // --- Wix (the original site) -----------------------------------------
  { source: "/product-page/:slug", destination: "/shop", statusCode: 301 },

  // Wix ran these as single-word pages with no separator. Both were still
  // 404ing in Search Console, which is the only reason they're named here
  // rather than guessed at — every rule in this file should come from a
  // URL somebody actually requested.
  //
  // Singular "bucket hat" on purpose: the shop search is a substring
  // match over name and description, so it catches "Bucket Hat" and
  // "Bucket Hats" alike, where the plural would miss every singular one.
  // A search rather than ?category=: the id would have to be the current
  // Square category's, and every hat already says "bucket hat" in its
  // own name.
  { source: "/buckethats", destination: "/shop?q=bucket+hat", statusCode: 301 },
  { source: "/eventcalendar", destination: "/events", statusCode: 301 },
  // Square Online's collections index. Crawled and not indexed rather
  // than 404ing, which is the soft-404 shape again.
  { source: "/collections", destination: "/shop", statusCode: 301 },

  // --- Old content pages -----------------------------------------------
  // /about, /events and /podcast kept their paths, so they need nothing.
  // Only /music moved.
  { source: "/music", destination: "/music-collective", statusCode: 301 },
  // /podcast is a real page again (app/podcast), so it needs no redirect —
  // adding one back would shadow the page, since redirects run before
  // filesystem routing.
];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects;
  },

  async headers() {
    return [
      {
        // Apple's domain verification file for Apple Pay, served from
        // public/.well-known/.
        //
        // Apple requires this URL to *download* the file rather than render
        // it, so it is served as an attachment. Do not "improve" this to
        // text/plain to make the URL readable in a browser — that is the
        // one thing Apple's checker rejects it for.
        //
        // The file is issued per merchant by Square (Developer Dashboard ->
        // Apple Pay) and must be served verbatim over HTTPS from whichever
        // host is registered, with no redirect in front of it: Apple
        // fetches this exact URL and does not follow redirects. If the apex
        // and www hosts redirect to one another, the registered domain has
        // to be whichever one answers directly.
        source: "/.well-known/apple-developer-merchantid-domain-association",
        headers: [
          { key: "Content-Type", value: "application/octet-stream" },
          {
            key: "Content-Disposition",
            value: 'attachment; filename="apple-developer-merchantid-domain-association"',
          },
        ],
      },
    ];
  },

  experimental: {
    serverActions: {
      // Every upload on this site goes through a Server Action, and the
      // default cap on a Server Action request body is 1MB — small enough
      // that an ordinary phone photo is rejected by Next before our own code
      // ever runs, which is why profile pictures and product photos appeared
      // to fail for no reason.
      //
      // 4.5MB is the ceiling worth asking for rather than an arbitrary
      // number: Vercel caps a serverless function's request body there, so
      // raising this past it would only move the failure, not fix it. The
      // per-file and per-batch limits in lib/media.ts sit just under this
      // with room for multipart overhead (boundaries and part headers add
      // 10-20KB, per Next's own guidance).
      //
      // Anything genuinely larger needs uploading straight to Supabase
      // Storage from the browser with a signed URL, which bypasses the
      // function body entirely. That's a separate piece of work.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
