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
 * Old product URLs all land on /shop rather than a specific item: the ids
 * in them are the previous platforms' catalog ids, which have no
 * relationship to the Square ids this site uses. Guessing a mapping would
 * send someone confidently to the wrong product, which is worse than
 * landing them in the shop.
 */
const legacyRedirects = [
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

  // Square Online product pages: /product/<slug>/<catalog-id>. Both a
  // two-segment and a one-segment form appeared, so cover the bare slug too.
  { source: "/product/:slug/:legacyId", destination: "/shop", statusCode: 301 },
  { source: "/product/:slug", destination: "/shop", statusCode: 301 },

  // --- Wix (the original site) -----------------------------------------
  { source: "/product-page/:slug", destination: "/shop", statusCode: 301 },

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
