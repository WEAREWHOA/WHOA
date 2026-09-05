# WHOA

A Next.js (App Router) storefront for WHOA, backed by Square for products,
inventory, and payments, plus a single password-protected **Backend
Portal** shared by everyone working with WHOA — customers, brand
ambassadors, art/vendor collective members, musicians, and SSBD crew are
all the same kind of account, distinguished only by which permissions a
Super Admin has granted them. See
[Backend Portal & permissions](#backend-portal--permissions) below.

## Mechanics

- Customers get **15% off** when they arrive via an ambassador's code or link.
- Ambassadors earn a flat **10% commission** on every sale, at every tier.
- Tiers (**Rookie → Rising → Icon**) unlock perks and recognition as order
  count grows — they never change the commission rate.
- Every ambassador can create multiple **tagged links** (e.g. "Instagram
  bio," "TikTok video 1") that all share the same discount code but track
  clicks separately, so they can see which channel actually converts.

## App layout & navigation

An Etsy-app-inspired shell: a persistent 5-tab nav (Events / Join / Shop /
You / About Us) rendered two ways depending on viewport, on every page
except the immersive home hub and `/pos`.

- `components/BottomNav.tsx` — a fixed bottom tab bar, mobile only
  (`md:hidden`), safe-area-aware (`env(safe-area-inset-bottom)`) for iOS
  home-indicator clearance. **Shop** (the center tab) renders as a raised,
  glowing circular button poking above the bar in the flame gradient
  (`btn-flame`) — a native-app "primary action" pattern (à la a FAB),
  rather than a plain icon+label like the other four tabs, since it's the
  actual money-making destination. `SiteChrome.tsx` adds extra bottom
  padding to `<main>` on mobile (enough to clear the raised button, not
  just the bar) so page content and the footer never sit under it.
- `components/Navbar.tsx` — the same 5 destinations as a horizontal top
  nav on desktop (`hidden md:flex`); the mobile hamburger dropdown this
  used to have is gone, since `BottomNav` now owns mobile navigation.
- **You** links to `/portal` if logged in, `/login` otherwise. That check
  can't happen in the root layout via `cookies()` — doing so would force
  the entire site into dynamic rendering just to highlight one nav tab, undoing
  the static/ISR rendering `/shop` and others depend on. Instead,
  `createSession`/`destroySession` (`lib/auth.ts`) set/clear a second,
  non-httpOnly `whoa_logged_in` cookie alongside the real (httpOnly)
  session cookie — carrying no meaningful value of its own, just a client-
  readable flag. `lib/useLoggedIn.ts` reads it via `useSyncExternalStore`
  (not `useState`+`useEffect`, which would either violate
  `react-hooks/set-state-in-effect` or cause a hydration mismatch reading
  `document.cookie` directly in a lazy initializer).
- `/join` — hub page, 5 big clickable tiles (Brand Ambassador Program,
  Events & Festivals, Art Collective, Music Collective, Pop Ups & Retail)
  linking to the real corresponding pages. "Pop Ups & Retail" links to
  `/events?category=whoadega`, pre-filtering to the real WHOADEGA
  category rather than needing content of its own.
- `/about-us` — hub consolidating Our Story, Partnerships (the real
  charitable donations), Contact, and links to FAQ/Shipping/Return/
  Privacy/Terms. Doesn't replace `/about` (still the full brand-story
  page, still linked from the footer) — this is the nav-level landing
  spot for "everything About-ish."
- `/events` and `/shop` both read an optional `?category=` param
  client-side via `useSearchParams()` inside a `<Suspense>` boundary
  (same reasoning as the You-tab cookie above — keeps both pages
  statically rendered instead of opting into dynamic rendering for one
  query param) to support deep links like the Pop Ups & Retail tile.

## Routes

**Storefront**

- `/shop` — product grid, pulled live from Square's Catalog + Inventory APIs
- `/shop/[itemId]` — product detail with a variation picker and add-to-cart
- `/cart` — cart (client-side, persisted to `localStorage`)
- `/checkout` — name/email + a Square Web Payments SDK card form; the 15%
  ambassador discount and referral attribution apply automatically if the
  visitor arrived via a `/r/[slug]` link
- `/order-confirmed` — confirmation after a successful payment
- `/pos` — staff point-of-sale register: PIN-gated (showcase-grade, not real
  access control — see [Staff POS](#staff-pos) below), tap-to-add products,
  running ticket, and a real Square charge via the same Web Payments SDK
  flow as `/checkout`

**Backend Portal**

- `/` — marketing landing page: hero, how-it-works, tiers, portal preview, FAQ, apply CTA
- `/join` — "Join the Community" hub tying together the ambassador
  program, events, the art/music collectives, and pop ups/retail
- `/about-us` — "About Us" hub: story, mission, partnerships, contact,
  and legal/info pages, all in one place
- `/apply` — creates a password-protected account with Brand Ambassador
  access already granted (name, email, Instagram, password); approval is
  instant. The ambassador code is generated from the applicant's first and
  last name run together (e.g. "Jane Doe" → `JANEDOE`, collisions get a
  trailing 2/3/4...) rather than the old `WHOA-<NAME>15` pattern — see
  `generateAmbassadorCode` in `lib/store.ts`. Submitting also emails
  info@wearewhoa.com via Resend (`sendAmbassadorApplicationNotification` in
  `lib/email.ts`), reply-to'd to the applicant; a failed notification is
  logged, not surfaced, so it never blocks the signup that already succeeded
- `/login`, `/portal` — log in (or sign up with just email + password) —
  every account, whatever its permissions, uses the same login
- `/portal/[code]` — the account's dashboard (session-protected — only the
  logged-in owner can view it). Customer is always visible; Brand
  Ambassadors, Vendor Sales, Music, and SSBD tabs only render if a Super
  Admin has granted that permission — see
  [Backend Portal & permissions](#backend-portal--permissions)
- `/super-admin`, `/super-admin/[code]` — Super Admin only: search any
  account by name/email/code and edit its permissions
- `/r/[slug]` — a trackable link. Logs a click on that specific link, sets a
  30-day `whoa_ref` cookie identifying the ambassador, and redirects to
  `/shop`. Any purchase made while that cookie is present gets the 15%
  discount applied in Square and a 10% commission recorded for the
  ambassador — this is the real, working order-attribution loop, not a stub.

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

| Variable                        | Default    | Purpose                                                                 |
| --------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | —          | Supabase project URL (Settings → API)                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | —          | Supabase `service_role` secret key (server-side only)                  |
| `SQUARE_ACCESS_TOKEN`           | —          | Square API access token (Developer Dashboard → your app → Credentials) |
| `SQUARE_LOCATION_ID`            | —          | Square location ID that the storefront reads/sells from                |
| `SQUARE_ENVIRONMENT`            | `sandbox`  | `sandbox` or `production`                                              |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | —      | Square Application ID — public, used by the Web Payments SDK client-side |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID`    | —      | Same value as `SQUARE_LOCATION_ID` — also needed client-side for the card form |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT`    | `sandbox` | `sandbox` or `production` — picks which Square.js script gets loaded |
| `SQUARE_WEBHOOK_SIGNATURE_KEY`  | —          | Signing secret for `/api/webhooks/square`, returned when the webhook subscription is created — see [Square ↔ Supabase sync](#square--supabase-sync) |
| `SQUARE_ADMIN_SECRET`           | —          | Shared secret gating the one-time `/api/admin/square/*` setup endpoints — pick any long random string |
| `NEXT_PUBLIC_SITE_URL`          | `http://localhost:3000` | Production domain, used for `metadataBase`, `sitemap.xml`, and `robots.txt` — set once the real domain is known |
| `SQUARE_ONLINE_CHANNEL_NAME`    | `Online Store` | Name of the Square sales channel that marks an item for `/shop` — set to `WHOA` for this account (see [Square ↔ Supabase sync](#square--supabase-sync)) |
| `RESEND_API_KEY`                | —          | Resend API key — sends order confirmation and event RSVP/ticket confirmation emails, plus info@wearewhoa.com staff notifications on every `/apply`, `/contact`, and Custom Design submission. `wearewhoa.art` must be a verified sending domain in Resend (see `lib/email.ts`) |
| `MAILCHIMP_API_KEY`             | —          | Mailchimp API key (Account → Extras → API keys). Its `-<datacenter>` suffix (e.g. `-us21`) is required and is parsed to build the API host — see `lib/mailchimp.ts` |
| `MAILCHIMP_AUDIENCE_ID`         | —          | The Mailchimp Audience/List ID (Audience → Settings → Audience name and defaults) that the `/events` newsletter signup subscribes into |

## SEO & metadata

- `app/icon.tsx` / `app/apple-icon.tsx` / `app/opengraph-image.tsx` — favicon and social-share image, generated at request time from the theme's own flame gradient (`next/og`'s `ImageResponse`) since no real WHOA logo asset exists yet.
- `app/not-found.tsx` — themed 404 page. Next.js 16 resolves unmatched URLs at the routing level, so a page-local `metadata` export here doesn't reach the response — the page just inherits the root title, which is fine since 404 responses get an automatic `noindex`.
- `app/sitemap.ts` / `app/robots.ts` — list the public marketing/shop pages plus live entries for every online product, artist, and musician. Staff-only and transactional routes (`/pos`, `/admin`, `/checkout`, `/cart`, etc.) are disallowed.
- Root layout sets `metadataBase` (from `NEXT_PUBLIC_SITE_URL`), a `%s | WHOA` title template, and shared Open Graph/Twitter card metadata. Static pages set their own `title`/`description`; `/shop/[itemId]`, `/art-collective/[slug]`, and `/music-collective/[slug]` use `generateMetadata()` to pull the live product/artist/musician name and description.

## Data layer & auth

Ambassador records, sessions, links, and commission records live in Supabase
(`lib/store.ts`, `lib/auth.ts`, via `lib/supabase.ts`), read and written only
from trusted server code (Server Components, Server Actions, Route
Handlers) using the `service_role` key — it's never sent to the browser.

Passwords are hashed with bcrypt (`lib/auth.ts`) and never stored or
returned in plain text; the public `getByCode`/`getByEmail` queries in
`lib/store.ts` explicitly exclude `password_hash` from their column list, so
it can't accidentally leak into a page or client component. Login sessions
are random tokens stored in a `sessions` table and set as an httpOnly,
secure, `sameSite=lax` cookie — not a stateless JWT — so a session can be
revoked by deleting its row (which logout does).

**Setup:**

1. Create a Supabase project (or use an existing one).
2. Run all fourteen migrations against it, **in order** — paste each into the
   Supabase SQL Editor, or apply them with the Supabase CLI if the project
   is linked (`supabase db push`):
   - `supabase/migrations/0001_init.sql` — creates `ambassadors` and
     `orders`, an `increment_ambassador_clicks` function (now unused, kept
     for history), and seeds the demo ambassador.
   - `supabase/migrations/0002_auth_and_links.sql` — adds `password_hash` to
     `ambassadors`, creates `sessions` and `links`, an
     `increment_link_clicks` function, and gives the demo ambassador a
     password + a default link.
   - `supabase/migrations/0003_square_sync.sql` — creates `square_products`,
     `square_product_variations`, `square_inventory_counts`,
     `square_orders`, and `square_order_line_items` (see
     [Square ↔ Supabase sync](#square--supabase-sync) below).
   - `supabase/migrations/0004_vendor_slug.sql` — adds `vendor_slug` to
     `ambassadors`, linking an account to a vendor for the dashboard's
     Vendor tab.
   - `supabase/migrations/0005_account_permissions.sql` — adds
     `perm_ambassador`, `perm_vendor`, `perm_music`, `perm_ssbd`, and
     `is_super_admin` to `ambassadors` (backfilling every existing row to
     `perm_ambassador = true`, since pre-migration every account was one).
     See [Backend Portal & permissions](#backend-portal--permissions).
   - `supabase/migrations/0006_square_customer_id.sql` — adds
     `square_customer_id` to `ambassadors`, caching the Square Customer
     match used by the Customer tab. See
     [Square Customers matching](#square-customers-matching).
   - `supabase/migrations/0007_graffiti_wall.sql` — creates
     `graffiti_drawings` for the WHOA Games graffiti wall. See
     [WHOA Games](#whoa-games).
   - `supabase/migrations/0008_custom_design.sql` — creates
     `custom_design_submissions` for the Custom Design bleach editor. See
     [Custom Design](#custom-design).
   - `supabase/migrations/0009_contact_messages.sql` — creates
     `contact_messages` for the `/contact` page's message form.
   - `supabase/migrations/0010_event_rsvps.sql` — creates `event_rsvps` for
     event RSVPs and ticket purchases. See [Events](#events).
   - `supabase/migrations/0011_events_admin_permission.sql` — adds
     `perm_events_admin` to `ambassadors`, gating the EVENTS ADMIN tab.
   - `supabase/migrations/0012_event_rsvp_artist.sql` — adds
     `selected_artist` to `event_rsvps`, the optional "pick an artist"
     answer on the RSVP/ticket form.
   - `supabase/migrations/0013_event_rsvp_waiver.sql` — adds
     `waiver_agreed_at` to `event_rsvps`, timestamping agreement to the
     damage-responsibility waiver for WHOAdega/SH!FT Gallery events.
   - `supabase/migrations/0014_account_soft_delete.sql` — adds
     `deleted_at` to `ambassadors`, backing the Settings tab's "delete
     account" action (deactivates the login, keeps the account's history).
   All fourteen enable RLS with no public policies — only the
   `service_role` key (which is what this app uses) can read or write.
3. **Bootstrap the first Super Admin** — there's no self-serve way to grant
   `is_super_admin` (by design), so after signing up your own account at
   `/login?mode=signup`, set it directly in the Supabase Table Editor:
   `update ambassadors set is_super_admin = true where email = 'you@example.com';`.
   From there you can grant every other permission — including Super Admin
   itself — from `/super-admin` in the app.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from
   Settings → API in the Supabase dashboard) as environment variables —
   locally in `.env.local`, and in the Vercel project's Environment
   Variables settings for deployment.

`lib/supabase.ts` creates its client lazily on first use rather than at
import time, so `npm run build` / `npm run lint` succeed even without these
vars set — only requests that actually touch the store need them.

## Backend Portal & permissions

One account model, one login, for everyone working with WHOA — a customer,
a brand ambassador, an art/vendor collective member, a musician, and SSBD
crew are all just rows in `ambassadors` (the table name predates this and
stayed to avoid a riskier rename — every field/type comment calls out that
it's really "account" now). What's different per account is which
dashboard tabs are unlocked:

Tab labels are ALL CAPS in the UI (CUSTOMER, BRAND AMBASSADORS,
ARTIST/VENDOR, MUSIC, SSBD); referred to here in normal case for
readability.

- **Customer** — always visible, no permission needed. Shows real Square
  purchase history, matched by email — see
  [Square Customers matching](#square-customers-matching).
- **Brand Ambassador** (`perm_ambassador`) — referral code/link, live
  stats, links manager, payouts. Granted automatically by `/apply`; a plain
  `/login?mode=signup` account starts without it.
- **Artist/Vendor** (`perm_vendor`) — sales/inventory scoped to whichever
  artist `vendor_slug` points at (see [migration 0004](#data-layer--auth)).
  Needs both the permission and a vendor slug set to show real data.
  Managing the artist's own listings (editing/uploading their catalog
  items, links, etc.) from this tab is a planned follow-up, not yet built
  — today it's read-only sales/inventory.
- **Music** (`perm_music`) — reserved for musicians; ships as a "coming
  soon" placeholder (`MusicTab.tsx`) since there's no Square sales data
  for music-collective artists yet, same honesty-over-fake-data posture as
  everywhere else in this app.
- **SSBD** (`perm_ssbd`) — Same Same But Different crew submissions tab.
- **Events Admin** (`perm_events_admin`) — the EVENTS ADMIN tab: KPIs
  (total guests, revenue, events with signups, most-requested artists) and
  a per-event guest list across **every** event, not just the account's
  own. Super Admins always have this, without needing the permission
  toggled on. See [Events](#events) below.

`components/dashboard/DashboardTabs.tsx` only renders the tab buttons a
given account actually has permission for; `app/portal/[code]/page.tsx`
computes `visible` from the logged-in account's `permissions` on every
load, so a revoked permission takes effect the next time that page loads.

**Super Admin** (`is_super_admin`) — a separate flag from the four
permissions above, and the only way to grant or revoke any of them
(including itself). `/super-admin` searches accounts by name/email/code;
`/super-admin/[code]` edits one account's permissions, vendor slug, and
Super Admin flag via `updateAccountPermissionsAction`
(`app/super-admin/actions.ts`), which re-checks `requireSuperAdmin()`
server-side regardless of what the UI shows — the same guard used by both
Super Admin pages (`lib/superAdmin.ts`). There's deliberately no self-serve
way to become the first Super Admin — see step 3 in
[Data layer & auth](#data-layer--auth) above.

**Settings** — always visible like Customer/Events, since every account
manages its own profile regardless of what else is unlocked. Three
`lib/actions.ts` server actions, each re-verifying the session owns the
account before doing anything:

- `updateAccountInfoAction` — name/email/Instagram. Rejects an email
  already in use by a *different* account the same way `registerAction`
  does, but allows saving the account's own unchanged email.
- `changePasswordAction` — requires the current password (verified with
  `verifyPassword` against the stored hash) before accepting a new one.
- `deleteAccountAction` — also requires the current password first, then
  calls `lib/store.ts`'s `deactivateAccount`, which sets `deleted_at`
  (`supabase/migrations/0014_account_soft_delete.sql`) rather than
  deleting the row. That's a deliberate choice: `getCredentialsByCode`/
  `getCredentialsByEmail` both filter out a deleted account, which is what
  actually blocks it from signing back in, but every order, referral link,
  click stat, and event RSVP tied to that account stays exactly as it was
  — "delete my account" means "delete my login," not "erase my history."
  The session is destroyed immediately after, same as a normal logout.

## Square Customers matching

WHOA had a large existing base of Square customers with purchase history
long before this account system existed. So that history shows up
automatically for anyone who signs up (or already has an account) with the
same email — no manual linking step.

- `lib/squareCustomers.ts` — `findSquareCustomerIdByEmail()` calls
  Square's Customers Search API with an **exact** email match (never
  fuzzy — a wrong fuzzy match would show one person's purchase history to
  someone else, which is worse than showing nothing).
  `getOrdersForSquareCustomer()` calls Square's Orders Search API filtered
  by that customer id — the authoritative source, not the
  `square_orders` sync mirror (which has no customer id column and only
  covers orders synced since the webhook existed, not historical ones).
  Searches every Square location (via `getAllLocationIds()`, not just the
  storefront's configured `SQUARE_LOCATION_ID`) and pages through the full
  result set — checking only one location or capping at one page both
  undercounted against what Square's own dashboard shows for a customer
  with history at more than one location or more than 100 orders.
- `getCustomerHistory()` runs on every `/portal/[code]` load for the
  logged-in account: if `square_customer_id` isn't cached yet
  ([migration 0006](#data-layer--auth)), it looks the email up once and
  saves the match; from there it fetches the Square Customer profile
  (email, phone) and full order history every load. Never throws — a
  Square API hiccup degrades to "no purchase history shown," not a
  broken dashboard.
- Square's own dashboard shows "Visits" / "First visit" / "Last visit" on
  a customer profile, but those aren't fields on the Customer object via
  the API — `deriveProfile()` computes the same thing from the exact
  order history already fetched (visit count = order count, first/last
  visit = earliest/latest order date) rather than inventing a separate
  concept.
- `components/dashboard/tabs/CustomerTab.tsx` shows a stat row (visits,
  first/last visit, email/phone on file) plus the full transaction list —
  every order with every line item and its price broken out, not
  condensed into one summary line — when linked; an honest "no Square
  profile found for this email yet" message when not; "no purchase
  history on file yet" when linked with zero orders. No fabricated data
  in any state.

## Square integration

Inventory and POS stay in Square — this app only reads the catalog and
inventory, and writes orders/payments back to Square, exactly as if a
cashier had rung up the sale. Nothing about products or stock is managed
here.

- `lib/square.ts` — a lazily-created Square SDK client (`getSquare()`), same
  pattern as `lib/supabase.ts`, so missing credentials don't break the build.
- `lib/catalog.ts` — `listProducts()`/`getProduct()` call
  `catalog.searchItems` (paginating via its `cursor` until exhausted — a
  catalog bigger than one page, 100 items by default, would otherwise
  silently lose everything past the first page from both `/shop`'s
  listing and individual product pages), batch-fetch item/variation
  images and category names, and `inventory.batchGetCounts` for stock
  levels. `listProducts({
  onlineOnly: true })` (used by `/shop` and `getProduct()`) scopes results
  to items in a designated "show this online" Square channel — resolved by
  name via `channels.list()` (see [`SQUARE_ONLINE_CHANNEL_NAME`](#environment-variables)
  above) since Square exposes channel membership as a list of IDs on the
  item, not a simple boolean. Fails closed (shows nothing) if that channel
  can't be identified, rather than risk silently showing private/in-person-only
  inventory. The POS register calls `listProducts()` with no options, so
  staff still see and can sell everything, online-enabled or not.
- **Categories, search, sort, and multiple product photos** — all from
  real Square data, not invented. `Product.categories` comes from each
  item's `categories` field (Square's own category assignments,
  batch-resolved to names the same way images are); `/shop`
  (`components/shop/ShopGrid.tsx`) turns whichever categories actually
  appear on the current online-visible items into filter pills, plus a
  client-side name/description search and a price/name sort — all real,
  no placeholder options for categories or attributes that don't exist in
  the catalog. `Product.imageUrls` carries every photo uploaded for an
  item (not just the first), so `/shop/[itemId]`
  (`components/shop/ProductGallery.tsx`) shows a real thumbnail gallery
  instead of a single image when more than one exists. A category badge
  on a product page links to `/shop?category=<id>`, which pre-filters the
  grid via `useSearchParams()` inside a `<Suspense>` boundary — kept
  client-side specifically so `/shop` itself stays statically rendered
  (`revalidate = 60`) rather than opting the whole page into dynamic
  rendering just for one query param.
- `app/checkout/actions.ts` — on checkout, creates a real Square `Order`
  (with a `FIXED_PERCENTAGE` 15% discount attached if a `whoa_ref` cookie
  is present), then a `Payment` against that order using the token from the
  Web Payments SDK. If an ambassador referred the sale, a row is appended to
  Supabase's `orders` table with the sale amount and 10% commission —
  this is what powers the live stats on `/portal/[code]`.
  `checkoutAction`'s `shippingAddress` param is optional and shared with
  `/pos`'s in-person checkout — present (and validated) from the online
  storefront, it attaches a `SHIPMENT` fulfillment (recipient name, phone,
  email, address) to the order so there's an actual place to send the
  package; omitted from the POS register, where a customer standing at the
  booth doesn't need one. US addresses only, for now.
- `checkoutAction` re-checks live Square inventory (`getInventoryCounts()`,
  exported from `lib/catalog.ts`) for every cart line right before
  creating the order — the cart page's own quantity input has no cap, and
  stock can go stale between "add to cart" and "hit pay" regardless. A
  variation Square doesn't track inventory for at all is treated as
  unlimited (missing from the counts map, same `null`-means-untracked
  convention `ProductVariation.inStock` already uses); a tracked variation
  short on stock blocks the order with a specific "only N left" or "just
  sold out" message rather than silently overselling. Shipping is free —
  the checkout summary states that explicitly as a line rather than
  leaving a silent $0 gap where a stated policy is expected.
- `CheckoutForm.tsx` treats a Square Web Payments script that never calls
  `onLoad` (ad blocker, flaky connection) as a real error after a 10s
  timeout, replacing the empty card field with an explanation and a
  reload action — previously the Pay button would just stay disabled
  forever with zero explanation.

**Setup:**

1. Go to [developer.squareup.com/apps](https://developer.squareup.com/apps),
   sign in with your Square account, and create (or open) an app.
2. Under **Credentials**, copy the **Access Token** (sandbox while testing;
   production once ready) and note your **Location ID**.
3. Set the environment variables above — `SQUARE_ACCESS_TOKEN` and
   `SQUARE_LOCATION_ID` stay server-only; `NEXT_PUBLIC_SQUARE_APPLICATION_ID`,
   `NEXT_PUBLIC_SQUARE_LOCATION_ID`, and `NEXT_PUBLIC_SQUARE_ENVIRONMENT` are
   safe to expose (the Web Payments SDK needs them in the browser).
4. Make sure the products you want to sell are marked available at that
   location in Square and have inventory tracking enabled if you want stock
   counts to show.

The Web Payments SDK handles card data directly in the browser (a token is
all that ever reaches this app's server), so this integration doesn't touch
raw card numbers and stays PCI-compliant the same way Square's own
checkout does.

## Staff POS

A showcase register at `/pos` for demonstrating this app as a full
front-of-house replacement for Square's own POS app — modeled directly on
Square's own mobile app (bottom tab bar: Checkout / Inventory /
Transactions / Notifications / More), same underlying Square account, card
processing, and order/payment flow as `/checkout`
(`app/checkout/actions.ts`'s `checkoutAction` is reused as-is). `/pos` is a
standalone app screen — `SiteChrome.tsx` skips the site nav/footer for it,
same as the home page.

- `components/pos/PosPinGate.tsx` / `usePosAuth.ts` — a 4-digit PIN gate
  (`2222`), same soft-gate posture as `/ssbd-admin`'s crew password: fine
  for keeping a register off the open web, not real access control. No
  per-staff accounts yet — "for now, one shared PIN."
- `components/pos/PosApp.tsx` / `PosTabBar.tsx` — the five-tab shell:
  - **Checkout** (`tabs/CheckoutTab.tsx`) — product search/grid (tap a
    single-variation product to add it directly; multi-variation products
    expand inline to pick one), a running ticket with quantity steppers,
    and a payment step embedding the same Web Payments SDK card form as
    `/checkout`.
  - **Inventory** (`tabs/InventoryTab.tsx`) — live stock levels per
    product, straight from the same `listProducts()` call the shop uses.
  - **Transactions** (`tabs/TransactionsTab.tsx`) — recent orders grouped
    by date, read from the Square sync mirror (`lib/posOrders.ts` →
    `square_orders`/`square_order_line_items`) rather than calling
    Square's API directly.
  - **Notifications** (`tabs/NotificationsTab.tsx`) — real today's-order
    count, not a fabricated activity feed.
  - **More** (`tabs/MoreTab.tsx`) — shortcuts into Orders/Items and a
    "Lock register" action; Reports/Settings are marked "Coming soon"
    rather than faked, since there's no reporting or settings backend yet.
- **This charges real cards on your live Square account** — there's no
  sandbox/demo-mode toggle, so be deliberate about what you run through it
  in a live demo.

Because `/pos` reuses `checkoutAction` unmodified, an in-person sale here
behaves exactly like an online one: if a `whoa_ref` referral cookie happens
to be set in that browser, the same 15%/10% ambassador discount and
commission would apply. That's fine for a showcase register used from a
clean browser, but worth knowing if this becomes the real in-store
register — a follow-up would separate POS sales from online attribution
explicitly rather than relying on the cookie being absent.

## Square ↔ Supabase sync

Square stays the system of record for POS, checkout, and payments — nothing
above changes. This adds a read-optimized mirror of Square's catalog,
inventory, and order history in Supabase, kept in sync via webhooks instead
of calling Square's API on every request. It's what will power per-vendor
sales/inventory views (e.g. the dashboard's Vendor tab) without hammering
Square's rate limits.

- `supabase/migrations/0003_square_sync.sql` — `square_products`,
  `square_product_variations`, `square_inventory_counts`, `square_orders`,
  `square_order_line_items`. Same RLS posture as every other table here:
  service-role-only, no public policies.
- `lib/squareSync.ts` — shared upsert logic (`syncFullCatalog`,
  `syncInventoryForVariations`, `syncOrder`, `backfillOrders`), used by both
  the webhook handler and the one-time backfill.
- `app/api/webhooks/square/route.ts` — verifies Square's
  `x-square-hmacsha256-signature` header (via the SDK's
  `WebhooksHelper.verifySignature`, HMAC-SHA256 over the notification URL +
  raw body) before processing anything. On `catalog.version.updated` it
  does a full catalog resync (simpler and more robust than diffing the
  payload); on `inventory.count.updated` it refreshes just the affected
  variations; on `order.updated` it re-fetches and upserts that one order.
  Unhandled event types are acked and ignored.
- `app/api/admin/square/register-webhook/route.ts` and
  `app/api/admin/square/backfill/route.ts` — one-time setup endpoints,
  gated by `SQUARE_ADMIN_SECRET` (sent as `Authorization: Bearer <secret>`).
  Not meant to be called repeatedly, and safe to re-run if you do — every
  sync step is an upsert.

**Setup (after the env vars above are already in place):**

1. Deploy this branch so `/api/webhooks/square` and `/api/admin/square/*`
   exist in production.
2. Set `SQUARE_ADMIN_SECRET` to any long random string, in Vercel.
3. Visit `https://yourdomain/admin/square-sync` — a small page with buttons
   that call the setup endpoints below, so this doesn't require a terminal.
   Paste in the `SQUARE_ADMIN_SECRET` value once, then:
   - **List locations** — only needs `SQUARE_ACCESS_TOKEN` to already be
     set. Copy the `id` from the result into Vercel as `SQUARE_LOCATION_ID`
     and `NEXT_PUBLIC_SQUARE_LOCATION_ID` (same value, both names) if you
     haven't already, then redeploy.
   - **Register webhook** — tells Square where to send updates. The
     response includes `signatureKey` — copy that into Vercel as
     `SQUARE_WEBHOOK_SIGNATURE_KEY` and redeploy before the next step.
   - **Run backfill** — pulls the full existing catalog, inventory, and
     order history in. Can take a while on a large history; safe to click
     again if it times out, since every step upserts.

   (Equivalent `curl` commands, if you'd rather script it: the same
   `-H "Authorization: Bearer $SQUARE_ADMIN_SECRET"` POST against
   `/api/admin/square/locations`, `/api/admin/square/register-webhook`, and
   `/api/admin/square/backfill`.)

From then on, catalog/inventory/order changes in Square flow into Supabase
automatically.

**Diagnosing "`/shop` shows no products":** `/shop` only lists items in a
designated "show this online" Square channel (`lib/catalog.ts`'s
`listProducts({ onlineOnly: true })`), resolved by name via
`channels.list()` — and fails closed (shows nothing) if that resolution
comes back empty, rather than risk showing private/in-person-only
inventory. On `/admin/square-sync`, the **"Diagnose /shop shows no
products"** button (`/api/admin/square/catalog-debug`) dumps exactly what
that check sees: Square's active channels, which one (if any) resolved as
the target channel, and per-item whether it's actually in that channel —
so a broken match shows up directly instead of just an empty page.

By default this looks for a channel literally named "Online Store" (what
Square creates automatically for sellers using Square's own hosted site).
This account doesn't have one — it uses a custom channel named **"WHOA"**
to mark items for the site instead, confirmed against the diagnostic's
real output (items in that channel line up almost exactly with the ones
that have real photos, and internal-only items like "Donation Bin" or
"CUSTOM ORDER ANY SIZE" correctly aren't in it). Set
`SQUARE_ONLINE_CHANNEL_NAME=WHOA` in Vercel (see the table above) so
`getOnlineStoreChannelId()` resolves to that channel instead of coming up
empty.

### Per-vendor matching

Each Square product's vendor name lives at the end of its title (e.g. "Tie
Dye Hoodie - WHOADY"), not in a dedicated field. `lib/vendorMatch.ts` checks
whether a product's title ends with one of the names in `lib/artists.ts`
(longest name first, so "Sol Search" can't be shadowed by a shorter partial
match) and stores the matching artist's slug as `square_products.owner_code`
during every catalog sync.

That mapping powers two things:

- **Art Collective** (`/art-collective/[slug]`) — pulls that vendor's live
  products, prices, and stock straight from the synced tables
  (`lib/vendor.ts`'s `getVendorProducts`) instead of hardcoded content.
  Force-dynamic rendering, since price/stock can change at any time.
- **Dashboard Vendor tab** — an ambassador account with a linked
  `vendor_slug` (see below) sees real sales totals, items sold, and
  inventory for just their own products (`getVendorStats`), computed from
  synced order line items. Without a linked vendor, the tab still shows the
  original "Not Activated" placeholder.

**Linking an account to a vendor**: there's no self-serve claim flow yet —
use the "Link an ambassador to a vendor" tool at the bottom of
`/admin/square-sync` (same `SQUARE_ADMIN_SECRET` auth), or set
`ambassadors.vendor_slug` directly in the Supabase table editor. The vendor
slug is the artist's URL slug from `/art-collective/<slug>`.

## WHOA Games

`/games` — a hub of small in-store/online games, built incrementally.
`lib/games.ts` lists every tile; a tile without an `href` is a real planned
build marked "Coming soon," not a dead link. Also reachable from the
homepage orbit (`components/home/OrbitField.tsx`, the "WHOA GAMES" stop).

- **WHOA Snake** (`components/games/snake/`) — a canvas Snake game where
  the trail is a flame gradient and the food is a "1-of-1 drop." Reaching
  a score threshold reveals a discount code, shown as something to tell
  staff at checkout — there's no backend tying a game score to a real
  Square discount yet, so it isn't auto-applied.
- **Mystery Drop Spinner** (`components/games/mystery-drop/`) — a
  weighted-random pull across a curated prize pool
  (`lib/games/mysteryDrops.ts`) standing in for real blind-box/upcycled
  inventory. Not live-linked to Square stock.
- **Which WHOA Piece Are You** (`components/games/quiz/`) — a 6-question
  quiz scored against 5 results (`lib/games/quiz.ts`); the result renders
  to an offscreen canvas and downloads as a PNG sized for Instagram
  Stories (9:16).
- **Graffiti Wall** (`components/games/graffiti/`) — a shared drawing
  canvas. Strokes save as normalized point paths in Supabase
  (`graffiti_drawings`, [migration 0007](#data-layer--auth)) rather than
  rasterized images — a whole drawing is a few KB of coordinates, so this
  stays cheap to run at any volume. `lib/graffiti.ts` clamps/caps stroke
  count, point count, and brush width server-side before insert, since
  this is a public, unauthenticated write path. The gallery renders saved
  strokes as SVG polylines (`DrawingThumbnail.tsx`) — no canvas replay
  logic needed for read-only display.
- **Beat Pad** (`components/games/beat-pad/`) — 16 pads (kick/snare/
  hats/toms/a pentatonic run of tones), each a synthesized hit via the
  Web Audio API (`lib/games/beatPad.ts`) rather than a sample — there
  are no real WHOA-branded audio assets yet, and the page says so
  rather than passing synth tones off as official recordings. Keyboard
  playable (1234/qwer/asdf/zxcv) alongside tap. Links out to
  `/music-collective` for the real thing.
- **Outfit Builder** (`components/games/outfit-builder/`) — pick real
  pieces from `listProducts({ onlineOnly: true })` (same catalog `/shop`
  shows) across five categories, guessed from each product's name
  (`lib/games/outfitLayers.ts`, same keyword-matching posture as
  `lib/vendorMatch.ts`'s vendor detection, since Square's catalog has no
  layer/slot field). Picks download as a PNG flatlay board rendered to
  an offscreen canvas. That download can fail if a product's image lacks
  CORS headers (a "tainted canvas" — nothing this app can force from its
  side), so it's wrapped in a try/catch with an honest fallback message
  ("take a screenshot instead") rather than silently doing nothing.
- **QR Scavenger Hunt** (`components/games/hunt/`, `lib/games/
  scavengerHunt.ts`) — six branches, each a real section of this platform
  (WHOADEGA, Art Collective, Music Collective, Brand Ambassadors, SSBD,
  Backend Portal), not arbitrary categories. `/games/hunt/[branch]` marks
  that branch found in localStorage (`useHuntProgress.ts`, same
  `useSyncExternalStore` pattern as `usePosAuth.ts`/`useSsbdAuth.ts` — note
  its `getServerSnapshot` must return the same cached empty-array
  reference every call, not a fresh `[]` literal, or React logs an
  infinite-loop warning); `/games/hunt` shows progress and reveals a prize
  code at 6/6. `/games/hunt/print` (staff-only, not linked from the public
  hub) generates real, scannable QR codes server-side via the `qrcode`
  package — genuine printable codes, not placeholder link text.
- **Visualizer** (`components/games/visualizer/AudioVisualizer.tsx`,
  `lib/games/visualizer.ts`) — a mic-reactive audio visualizer, not an
  uploaded/streamed track player: it captures live room audio via
  `getUserMedia` + Web Audio's `AnalyserNode` so it reacts to whatever's
  actually playing nearby, and says so on the idle screen ("nothing is
  recorded or sent anywhere — it's only analyzed live, in your browser").
  Three canvas render modes (bars/radial/ribbon), three color palettes, and
  sensitivity/smoothing sliders are all switchable live. Mode/palette/
  sensitivity are read inside the `requestAnimationFrame` loop via refs
  synced from state in a `useEffect` — assigning them directly in the
  render body trips the `react-hooks/refs` lint rule ("Cannot access refs
  during render"), the same gotcha hit in `SnakeGame.tsx`'s `tick` ref.
- **WHOA Puzzle** (`components/games/whoa-puzzle/WhoaPuzzle.tsx`,
  `lib/games/whoaPuzzle.ts`) — a classic 3×3 sliding tile puzzle. The
  source art (a flame-gradient board with the WHOA wordmark plus a few
  scattered accent dots, so every tile has a distinct visual cue) is
  drawn once to an off-screen canvas and each tile's slice is redrawn
  from it into its own `<canvas>` via `drawImage` whenever the board
  changes — deliberately not "generate one image, store it in state,"
  since piping a canvas-generated data URL through `setState` inside a
  mount `useEffect` trips the newer `react-hooks/set-state-in-effect`
  lint rule; this keeps the canvas a DOM detail the effect synchronizes
  instead. `shuffleBoard()` always shuffles by replaying random *legal*
  moves from the solved state, guaranteeing a solvable board (a random
  permutation of tiles is only solvable half the time). The very first
  board can't be `shuffleBoard()`'s real `Math.random()` output either —
  that runs during SSR too, so the server-rendered board would differ
  from the client's post-hydration board and React would throw a
  hydration-mismatch error — so first paint uses `initialBoard()`, the
  same shuffle logic seeded with a tiny deterministic PRNG instead,
  identical on server and client; the "Shuffle" button's reshuffle stays
  genuinely random since it only ever runs client-side, after a click.
  Solving it — and only solving it — shows "WHOA!"
- **WHOASIS Arcade Cabinet** (`app/games/arcade-cabinet/`) — not a web
  game at all, so it's not marked "Coming soon" forever waiting on code
  that will never make it playable in a browser. It's a real page laying
  out the actual physical build: every other game already runs full-screen
  in a browser, so the cabinet is just that browser in kiosk mode, on real
  hardware, pointed at `/games`. `GameTile.ctaLabel` lets a live tile
  override the default "Play now →" label — this one shows "See the plan
  →" instead, since there's nothing to play.

All ten tiles are live.

## Custom Design

`/custom-design` (`components/customDesign/`, `lib/customDesign.ts`) — an
"Editor Tool" for bleaching a design onto a garment: pick one of four
black-only templates (T-Shirt, Hoodie, Tapered Sweatpants, Wide Leg
Sweatpants), then draw with a Marker or Spray brush (each with its own
size/density, spray also has spread) and submit contact info. **This is
explicitly a test of the submission pipeline, not a live ordering flow** —
the page says so, and no email/fulfillment integration exists yet; that's
future work once the pipeline itself is proven out.

- **Two kinds of template, one shared interface** — `GarmentTemplate` in
  `lib/customDesign.ts` is a discriminated union. Tapered Sweatpants (no
  real photo available yet) is `kind: "vector"`: a list of polygons in a
  300×380 space that drives the on-screen SVG, a Path2D bleach clip region
  (`buildGarmentPath2D`), and the submission preview's base layer, all
  from one set of coordinates. T-Shirt, Hoodie, and Wide Leg Sweatpants
  (`public/custom-design/*.jpg`) are `kind: "image"`, using real photos —
  once there's a photo for tapered sweatpants too, it can switch over the
  same way.
- **An image template's bleach clip is a raster mask, not a Path2D** —
  there's no vector geometry for a photo, so `buildGarmentMask()` builds
  one at runtime: flood-fill outward from the image's four corners,
  following only pixels close to the sampled background color. A flat
  per-pixel "is this background-colored" check would also erase the
  light-colored piped seams, hood outline, pocket outline, and
  drawstrings drawn *on* these particular garment photos — they're close
  in color to the true background. Flood-fill only marks background
  pixels that are actually *connected* to the frame's edge, so those
  interior details (islands fully surrounded by the dark garment) are
  never reached and stay part of the mask. Live strokes accumulate on an
  off-screen "ink" canvas exactly like a vector template's, then get
  composited onto the visible canvas via `destination-in` against that
  mask (`compositeVisible()`) — the stroke data model, sanitization, and
  undo-by-replay logic are identical either way; only how the final pixels
  get clipped differs.
- **Bleach color is an authentic rust/tan (`#caa06a`), not flat white** —
  bleach breaks down black cotton dye to the fabric's underlying pigment,
  which reads warm, not clean white. The bleach canvas sits over the
  black garment with `mix-blend-mode: screen`, so marks visually lighten
  the black rather than sitting on top of it as flat paint.
- **Marker vs. Spray reuse one draw function** (`drawStroke`) for both
  live, incremental drawing and a full replay of every point — a marker
  segment is drawn as a 2-point mini-stroke on each pointer move; a spray
  burst is drawn as just the newly-generated dabs (via
  `generateSprayDabs`, a uniform-disk random scatter) rather than
  redrawing every dab from the whole stroke every frame. Undo replays
  every remaining stroke from scratch after popping the last one — same
  redraw-on-undo approach as the WHOA Puzzle.
- **Mouse and finger both work with no separate code path** — pointer
  events (`onPointerDown/Move/Up`) unify mouse, touch, and pen input,
  same approach as the Graffiti Wall canvas.
- **The submission is genuinely captured, not faked** — `submitDesign()`
  sanitizes and inserts the stroke data (jsonb, same normalized-point-path
  posture as `graffiti_drawings`) plus a flattened PNG preview (so a
  submission is inspectable without a staff-facing viewer that replays
  strokes) into `custom_design_submissions`, then emails info@wearewhoa.com
  via Resend (`sendCustomDesignNotification`, reply-to'd to the customer).
  It's public/customer-facing, so — like checkout and the ambassador
  referral lookup — the Supabase call is wrapped in try/catch and fails
  soft with an error message rather than throwing; the email notification
  is its own inner try/catch, logged on failure rather than surfaced,
  since the submission is already safely stored by that point.

## Events

`/events` (`lib/events.ts`, `components/events/`) — flyer grid + calendar for
a static `EVENTS` list. Every event without its own external ticketing now
runs a real RSVP/ticket flow through this app rather than a local-only
toggle:

- **`EventInfo.priceCents`** (optional, in cents) decides the button:
  unset/`0` shows **Free RSVP**, set shows **Buy Ticket $X** and charges
  through the same in-app Square checkout the shop uses.
- **Early-bird pricing** — `EventInfo.earlyBirdPriceCents` (optional)
  discounts the ticket to that amount any day before `startDate`;
  `priceCents` becomes the general-admission/door price starting the day
  of the event itself. `lib/events.ts`'s `getCurrentPriceCents(event)` is
  the single source of truth for "what does this cost right now" — every
  place that shows or charges a price (`EventCard`, `EventModal`,
  `EventCheckoutModal`, and `eventRsvpAction`) calls it instead of reading
  `priceCents` directly. Critically, `eventRsvpAction` computes it
  server-side from the real current date at the moment of charge, so the
  cutoff is actually enforced — a client can't submit a stale early-bird
  price after it's expired.
  `EventInfo.href`
  is the escape hatch for an event with its own real ticketing elsewhere
  (e.g. a festival WHOA just has a presence at, or Same Same But
  Different's own `ssbdfest.com`) — those show a single outbound **Buy
  Tickets** link instead of the in-app RSVP/checkout button, never both,
  and are never charged through this app. `priceCents`/
  `earlyBirdPriceCents` and `href` are mutually exclusive per event.
- **Tickets close automatically once an event is over** —
  `lib/events.ts`'s `isTicketingOpen(event)` (backed by
  `getTicketingCloseDate(event)`) computes the moment purchasing/RSVPing
  actually closes: the event's own stated end time on its last day
  (`endDate ?? startDate`), parsed from `timeLabel` and rolled to the next
  calendar day for an overnight window like "9PM – 4AM"; 11PM on its last
  day when `timeLabel` has no parseable clock time at all ("3 Days", "4
  Days"). Past that moment, `EventCard` and `EventModal` swap every CTA —
  Buy Tickets, Free RSVP, or an external `href` link alike — for a
  disabled "Event Ended" pill, and `eventRsvpAction` refuses server-side
  regardless of what the client sends (the same never-trust-the-client
  posture as `getCurrentPriceCents`). This is what lets the site keep a
  full historical flyer archive (see below) without any of those old
  events staying purchasable forever.
- **Historical flyer archive** — every past WHOAdega/SH!FT/community flyer
  WHOA has put out is in `EVENTS`, not just upcoming ones, so `/events`
  doubles as a running archive. They stay fully visible (`isTicketingOpen`
  is what closes their CTA, not a filter that hides them), transcribed
  from the original flyer image for title, date, time, venue, lineup, and
  any stated price/ticket link.
- **Real flyer photos** — `EventInfo.imageUrl` (optional, under
  `public/events/`) shows the actual flyer as the card/calendar cover in
  place of the CSS gradient. `EventCard`, `EventModal` (both faces), and
  `EventsCalendar`'s day cells all check it the same way: photo + a dark
  gradient/solid scrim behind the existing text so venue/date/lineup stay
  legible, falling back to the plain gradient card when unset. A calendar
  day with more than one event only shows the first event's photo as the
  cell background — every event that day still gets its own chip on top.
- **Flyer-shaped cards** — `EventCard`'s cover (gradient/photo + the text
  overlay on top of it) is fixed to standard 8.5×11 flyer proportions
  (`aspect-[8.5/11]`) rather than growing to fit each event's own amount of
  text, so the grid reads like a wall of actual posters instead of
  mismatched cards; the RSVP/Buy Ticket bar sits below that box, not inside
  it.
- **Damage responsibility waiver** — any event whose venue mentions
  "WHOAdega" or "SH!FT" (`lib/events.ts`'s `requiresDamageWaiver(event)`,
  derived from `venue` text rather than a manually-set flag, so a newly
  authored event at either venue picks it up automatically) shows
  `DamageWaiverModal.tsx` — the gallery's real liability text, verbatim —
  before the RSVP/Buy Ticket form, gated on clicking **Agree**.
  `EventsGrid.tsx` is what enforces the ordering client-side (both
  `EventCard` and `EventModal`'s checkout buttons route through
  `handleCheckoutRequest`, which opens the waiver first and only opens
  `EventCheckoutModal` once it resolves); `eventRsvpAction` re-checks the
  same condition server-side and rejects the RSVP outright if
  `waiverAgreed` wasn't sent, since a client-side gate alone is never
  enforcement. A guest's agreement is timestamped on their RSVP row
  (`event_rsvps.waiver_agreed_at`,
  `supabase/migrations/0013_event_rsvp_waiver.sql`) so there's an actual
  record of who agreed and when — the whole point of a liability waiver is
  moot if acceptance isn't provable later. An event with its own external
  `href` never shows this at all, since it never reaches this app's
  checkout in the first place.
- **`components/events/EventCheckoutModal.tsx`** is the actual flow,
  opened from either `EventCard` or `EventModal`'s button — name, email,
  optional phone, an optional "pick an artist" dropdown (see below), and
  the same inline "sign in or create an account with this email" bar as
  checkout (see below). A paid event additionally loads the Square Web
  Payments SDK card field, exactly like `CheckoutForm.tsx`; a free RSVP
  never loads it at all. On success it shows a QR code (generated
  server-side by `eventRsvpAction`) linking to `/checkin/[rsvpId]` — a
  public, read-only ticket page a guest can present at the door.
- **Pick an artist** — when an event has a `lineup` (see `EventInfo.lineup`
  in `lib/events.ts`), the form shows an optional "Pick an artist" `<select>`
  populated straight from that lineup, defaulting to "No preference." The
  choice is validated server-side against the event's own lineup (so a
  tampered request can't inject an arbitrary string) and stored on the RSVP
  row as `selected_artist`
  (`supabase/migrations/0012_event_rsvp_artist.sql`) — it's purely a
  reporting signal, not a seating or access restriction.
- **`app/events/actions.ts`**'s `eventRsvpAction` does the work: resolves
  the account, and for a paid event creates an ad-hoc Square order (a
  `name` + `basePriceMoney` line item — events aren't Square catalog
  items, so there's no `catalogObjectId` to reference) and payment, the
  same customer-linking and best-effort confirmation email as checkout.
  Every RSVP/ticket — free or paid — is recorded in `event_rsvps`
  (`supabase/migrations/0010_event_rsvps.sql`), linked to the account if
  one exists.
- **The portal's Events tab** (`components/dashboard/tabs/EventsTab.tsx`,
  always visible like Customer) reads that table back via
  `lib/eventRsvps.ts`'s `getEventHistoryForAccount`, joined against
  `EVENTS` and split into upcoming/past by date.
- **The portal's EVENTS ADMIN tab** (`components/dashboard/tabs/EventsAdminTab.tsx`,
  gated by `perm_events_admin` or Super Admin — see
  [Backend Portal & permissions](#backend-portal--permissions)) is the
  Eventbrite-style organizer view: KPI tiles (total guests, total revenue,
  events with signups, most-requested artists across every event), then
  every event — upcoming first, then past — as a collapsible guest list
  (name, email, phone, picked artist, RSVP vs. ticket + price paid, and
  when). `lib/eventsAdmin.ts`'s `getEventsAdminOverview()` builds this from
  `lib/eventRsvps.ts`'s unscoped `getAllRsvps()` joined against every
  `EVENTS` entry (including ones with zero signups, so a dead event is
  visible as "0 guests" rather than missing). Unlike the customer-facing
  Events tab, this function lets a real fetch failure throw instead of
  degrading to an empty result — showing "0 guests" to staff on a broken
  connection would be misleading, not a safe default. `app/portal/[code]/page.tsx`
  only calls it when the logged-in account is actually authorized, so the
  guest list/revenue data is never fetched (let alone rendered) for anyone
  who shouldn't see it.
- **Shared account bar**: the inline sign-in/sign-up logic checkout and
  event RSVPs both use lives in `lib/accountAuth.ts` (`resolveAccount`) and
  `app/account/actions.ts` (`getAccountAction`/`accountSignOutAction`) —
  extracted once a second flow needed the exact same "verify existing
  password, or create an account, or just continue as a guest" behavior.

The only WHOA-run event with a price set today is "WHOA Wednesday — Spooky
Secret Lineup" ($10 early bird, $15 general admission at the door) — every
other current event shows Free RSVP until a real price is set on it.

- **Newsletter signup** — a banner at the top of `/events`
  (`EventsNewsletterBanner.tsx`) with a single "Sign Up" button that opens
  `NewsletterSignupModal.tsx` (first name, last name, phone (optional),
  email), so the WHOAdega/SH!FT/events crowd can be emailed separately from
  anyone who only ever bought from `/shop`. `lib/mailchimp.ts`'s
  `subscribeToNewsletter({email, firstName, lastName, phone, tags})` calls
  Mailchimp's Marketing API directly (no SDK dependency): it tries to
  create the member with the tag and name/phone merge fields already
  attached, and if they're already on the list (Mailchimp's `Member Exists`
  response), it falls back to a `PATCH` that updates just their merge
  fields plus a separate call that adds the tag — deliberately never
  resending a `status` on that fallback path, so this can't accidentally
  force-resubscribe someone who previously opted out. `app/events/actions.ts`'s
  `subscribeEventsNewsletterAction` is the public-facing server action;
  like `lib/contact.ts`'s `submitContactMessage`, it fails soft (returns an
  error string) rather than throwing. Requires `MAILCHIMP_API_KEY` and
  `MAILCHIMP_AUDIENCE_ID` (see [Environment variables](#environment-variables))
  — without them, signup attempts return a "not set up yet" error rather
  than crashing the page. **The Mailchimp audience needs a "Phone Number"
  merge field with tag `PHONE`** (Audience → Settings → Audience fields) —
  `FNAME`/`LNAME` are Mailchimp defaults, but `PHONE` isn't, and without it
  the phone number is silently dropped rather than saved.

## About, Contact & Policy pages

`/about`, `/contact`, `/shipping-policy`, and `/return-policy` — real
content, not placeholder copy. The migration from the previous Square
Online site couldn't be automated (that site isn't reachable from this
app's environment), so this content was supplied directly and transcribed
here rather than scraped.

- `/about` — the brand story and the two charitable donations ($888 to The
  Surfrider Foundation USA, $500 to Children International), each linking
  out to the real organization.
- `/contact` (`components/contact/ContactForm.tsx`, `lib/contact.ts`) — a
  themed message form (name/email, a topic picker, a message field) over
  `PsychedelicBackground`, plus direct email and Instagram links.
  Submissions are stored in `contact_messages` (via `submitContactAction` →
  `submitContactMessage`) for staff to read later, and also email
  info@wearewhoa.com via Resend (`sendContactMessageNotification`,
  reply-to'd to the sender) — same notify-on-submit posture as `/apply` and
  Custom Design's submission pipeline. The notification is best-effort: the
  message is already safely stored by the time it's attempted, so a Resend
  hiccup is logged, not surfaced to the visitor.
- `/shipping-policy` and `/return-policy` — transcribed from the
  previous site's real policy text, with one deliberate correction: the
  old copy referenced calculated shipping rates and international
  shipping, neither of which is true here (checkout is free-shipping,
  US-only — see `app/checkout/actions.ts` and `lib/types.ts`'s
  `ShippingAddress`), so those lines were updated to match actual current
  behavior instead of carrying over a stale claim.
- `/privacy-policy`, `/terms-of-service`, and `/faq`
  (`components/faq/FaqAccordion.tsx`) — **first drafts**, written from
  what this app actually does (what data checkout/contact/ambassador
  signup collect, the `whoa_ref`/`whoa_session` cookies and their 30-day
  lifetimes, Square/Supabase as the only third parties involved, no
  analytics on the site today) rather than generic boilerplate. They
  assume California governing law based on WHOADEGA's real location (Ocean
  Beach, San Diego) — **get these reviewed by a lawyer before relying on
  them**, especially for state-specific consumer-privacy requirements
  (e.g. CCPA) this draft doesn't attempt to fully address.

All seven pages link the store's real phone number, (619) 630-9551.

## Theme

The dark, flame-gradient streetwear-art look is an original interpretation
built from the brand's public description, not a scrape of the live site.
Color tokens live in `app/globals.css` (`--flame-1/2/3`, `--tier-*`,
`--background`, `--surface`) — adjust them there for an exact brand match.
