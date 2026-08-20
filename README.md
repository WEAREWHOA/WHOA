# WHOA Ambassador Program

A Next.js (App Router) app for the WHOA ambassador program: create a
password-protected account, get a code plus multiple trackable links, and
watch clicks/orders/commission roll in on a personal portal.

## Mechanics

- Customers get **15% off** with an ambassador's code or any of their links.
- Ambassadors earn a flat **10% commission** on every sale, at every tier.
- Tiers (**Rookie → Rising → Icon**) unlock perks and recognition as order
  count grows — they never change the commission rate.
- Every ambassador can create multiple **tagged links** (e.g. "Instagram
  bio," "TikTok video 1") that all share the same discount code but track
  clicks separately, so they can see which channel actually converts.

## Routes

- `/` — marketing landing page: hero, how-it-works, tiers, portal preview, FAQ, apply CTA
- `/apply` — creates a password-protected ambassador account (name, email,
  Instagram, password); approval is instant
- `/login`, `/portal` — log in with an ambassador code or email, plus password
- `/portal/[code]` — the ambassador dashboard (session-protected — only the
  logged-in owner can view it): code, live stats, tier progress, recent
  orders, the links manager, caption/resource pack, payout settings, logout
- `/r/[slug]` — a trackable link. Logs a click on that specific link and
  302-redirects to the storefront (`STOREFRONT_URL`, defaults to
  `https://www.wearewhoa.art`) with `?ref=<code>&promo=<code>&tag=<slug>`
  attached

A seeded demo ambassador is available for exploring a populated portal:
**code `WHOA-DEMO15`, password `whoa-demo-2026`**.

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
| `STOREFRONT_URL`             | `https://www.wearewhoa.art`  | Where `/r/[slug]` redirects customers to             |
| `NEXT_PUBLIC_SUPABASE_URL`   | —                             | Supabase project URL (Settings → API)                |
| `SUPABASE_SERVICE_ROLE_KEY`  | —                             | Supabase `service_role` secret key (server-side only) |

## Data layer & auth

Ambassador records, sessions, and links live in Supabase (`lib/store.ts`,
`lib/auth.ts`, via `lib/supabase.ts`), read and written only from trusted
server code (Server Components, Server Actions, Route Handlers) using the
`service_role` key — it's never sent to the browser.

Passwords are hashed with bcrypt (`lib/auth.ts`) and never stored or
returned in plain text; the public `getByCode`/`getByEmail` queries in
`lib/store.ts` explicitly exclude `password_hash` from their column list, so
it can't accidentally leak into a page or client component. Login sessions
are random tokens stored in a `sessions` table and set as an httpOnly,
secure, `sameSite=lax` cookie — not a stateless JWT — so a session can be
revoked by deleting its row (which logout does).

**Setup:**

1. Create a Supabase project (or use an existing one).
2. Run both migrations against it, **in order** — paste each into the
   Supabase SQL Editor, or apply them with the Supabase CLI if the project
   is linked (`supabase db push`):
   - `supabase/migrations/0001_init.sql` — creates `ambassadors` and
     `orders`, an `increment_ambassador_clicks` function (now unused, kept
     for history), and seeds the demo ambassador.
   - `supabase/migrations/0002_auth_and_links.sql` — adds `password_hash` to
     `ambassadors`, creates `sessions` and `links`, an
     `increment_link_clicks` function, and gives the demo ambassador a
     password + a default link.
   Both enable RLS with no public policies — only the `service_role` key
   (which is what this app uses) can read or write.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from
   Settings → API in the Supabase dashboard) as environment variables —
   locally in `.env.local`, and in the Vercel project's Environment
   Variables settings for deployment.

`lib/supabase.ts` creates its client lazily on first use rather than at
import time, so `npm run build` / `npm run lint` succeed even without these
vars set — only requests that actually touch the store need them.

## Closing the order-attribution loop

Today, `/r/[slug]` tracks the click and hands off `ref`/`promo`/`tag` params
to the storefront, and account creation/login/payout settings/link creation
are all wired end-to-end — but nothing reports real *orders* back into an
ambassador's stats yet, since this app doesn't control checkout on the
actual storefront. Two realistic ways to close that loop:

1. **Storefront webhook.** If the storefront is Shopify (or similar), add a
   webhook on `orders/create` that reads the `ref`/`promo`/`tag` params
   captured at checkout (e.g. via a cookie set when `/r/[slug]` redirects)
   and POSTs the order back to this app to append to the ambassador's
   `orders` list.
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
