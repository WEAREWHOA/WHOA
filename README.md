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
- `/apply` — creates a password-protected account with Brand Ambassador
  access already granted (name, email, Instagram, password); approval is instant
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
2. Run all five migrations against it, **in order** — paste each into the
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
   All six enable RLS with no public policies — only the `service_role` key
   (which is what this app uses) can read or write.
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
- `getCustomerHistory()` runs on every `/portal/[code]` load for the
  logged-in account: if `square_customer_id` isn't cached yet
  ([migration 0006](#data-layer--auth)), it looks the email up once and
  saves the match so future loads skip straight to fetching orders. Never
  throws — a Square API hiccup degrades to "no purchase history shown,"
  not a broken dashboard.
- `components/dashboard/tabs/CustomerTab.tsx` shows the real order list
  (items, date, total, Square order state) when linked, an honest "no
  Square profile found for this email yet" message when not, and "linked
  but nothing on file yet" when linked with zero orders — no fabricated
  data in any state.

## Square integration

Inventory and POS stay in Square — this app only reads the catalog and
inventory, and writes orders/payments back to Square, exactly as if a
cashier had rung up the sale. Nothing about products or stock is managed
here.

- `lib/square.ts` — a lazily-created Square SDK client (`getSquare()`), same
  pattern as `lib/supabase.ts`, so missing credentials don't break the build.
- `lib/catalog.ts` — `listProducts()`/`getProduct()` call
  `catalog.searchItems`, batch-fetch item/variation images, and
  `inventory.batchGetCounts` for stock levels.
- `app/checkout/actions.ts` — on checkout, creates a real Square `Order`
  (with a `FIXED_PERCENTAGE` 15% discount attached if a `whoa_ref` cookie
  is present), then a `Payment` against that order using the token from the
  Web Payments SDK. If an ambassador referred the sale, a row is appended to
  Supabase's `orders` table with the sale amount and 10% commission —
  this is what powers the live stats on `/portal/[code]`.

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

## Theme

The dark, flame-gradient streetwear-art look is an original interpretation
built from the brand's public description, not a scrape of the live site.
Color tokens live in `app/globals.css` (`--flame-1/2/3`, `--tier-*`,
`--background`, `--surface`) — adjust them there for an exact brand match.
