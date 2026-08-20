# WHOA Ambassador Program

A Next.js (App Router) app for the WHOA ambassador program: apply, get an
instant code + special link, and track clicks/orders/commission from a
personal portal.

## Mechanics

- Customers get **15% off** with an ambassador's code or special link.
- Ambassadors earn a flat **10% commission** on every sale, at every tier.
- Tiers (**Rookie → Rising → Icon**) unlock perks and recognition as order
  count grows — they never change the commission rate.

## Routes

- `/` — marketing landing page: hero, how-it-works, tiers, portal preview, FAQ, apply CTA
- `/apply` — application form; approval is instant and generates a code + special link
- `/login`, `/portal` — log in with an existing ambassador code or email
- `/portal/[code]` — the ambassador dashboard: code + link, live stats, tier
  progress, recent orders, caption/resource pack, payout settings
- `/r/[code]` — the special link. Logs a click and 302-redirects to the
  storefront (`STOREFRONT_URL`, defaults to `https://www.wearewhoa.art`)
  with `?ref=<code>&promo=<code>` attached

A seeded demo ambassador is available at code `WHOA-DEMO15`
(`demo@wearewhoa.art`) for exploring a populated portal.

## Getting started

```bash
npm install
npm run dev
```

```bash
npm run lint
npm run build
```

## Environment variables

| Variable                     | Default                     | Purpose                                              |
| ----------------------------- | ---------------------------- | ----------------------------------------------------- |
| `STOREFRONT_URL`             | `https://www.wearewhoa.art`  | Where `/r/[code]` redirects customers to             |
| `NEXT_PUBLIC_SUPABASE_URL`   | —                             | Supabase project URL (Settings → API)                |
| `SUPABASE_SERVICE_ROLE_KEY`  | —                             | Supabase `service_role` secret key (server-side only) |

## Data layer

Ambassador records (code, stats, orders, payout settings) live in Supabase
(`lib/store.ts` via `lib/supabase.ts`), read and written only from trusted
server code (Server Components, Server Actions, Route Handlers) using the
`service_role` key — it's never sent to the browser.

**Setup:**

1. Create a Supabase project (or use an existing one).
2. Run `supabase/migrations/0001_init.sql` against it — paste it into the
   Supabase SQL Editor, or apply it with the Supabase CLI if the project is
   linked (`supabase db push`). It creates the `ambassadors` and `orders`
   tables (RLS enabled, no public policies — only the `service_role` key can
   read/write, which is what this app uses), an `increment_ambassador_clicks`
   function used by `/r/[code]`, and seeds the demo ambassador
   (`WHOA-DEMO15`).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from
   Settings → API in the Supabase dashboard) as environment variables —
   locally in `.env.local`, and in the Vercel project's Environment
   Variables settings for deployment.

`lib/supabase.ts` creates its client lazily on first use rather than at
import time, so `npm run build` / `npm run lint` succeed even without these
vars set — only requests that actually touch the store need them.

## Closing the order-attribution loop

Today, `/r/[code]` tracks the click and hands off `ref`/`promo` params to the
storefront, and applications/logins/payout settings are wired end-to-end —
but nothing reports real *orders* back into an ambassador's stats yet, since
this app doesn't control checkout on the actual storefront. Two realistic
ways to close that loop:

1. **Storefront webhook.** If the storefront is Shopify (or similar), add a
   webhook on `orders/create` that reads the `ref`/`promo` param captured at
   checkout (e.g. via a cookie set when `/r/[code]` redirects) and POSTs the
   order back to this app to append to the ambassador's `orders` list.
2. **Dedicated affiliate platform.** Point the program at a platform built
   for this (e.g. Social Ladder, Refersion, Rewardful) and have this app act
   as the branded application/portal front-end, syncing codes and reading
   back attributed orders via that platform's API instead of tracking orders
   itself.

## Theme

The dark, flame-gradient streetwear-art look is an original interpretation
built from the brand's public description, not a scrape of the live site.
Color tokens live in `app/globals.css` (`--flame-1/2/3`, `--tier-*`,
`--background`, `--surface`) — adjust them there for an exact brand match.
