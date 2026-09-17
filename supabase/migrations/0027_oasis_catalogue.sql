-- OASIS CATALOGUE — a pre-order catalogue of special items, deliberately
-- separate from the Square-backed shop.
--
-- Nothing here touches Square. These items are not catalog objects, have
-- no inventory counts and are never charged at checkout: an order is a
-- pre-order *request* that staff follow up on. Keeping the two apart is
-- the point — the shop can be resynced from Square at any time without
-- disturbing the catalogue, and a catalogue item can exist long before
-- anything is manufactured.

create table if not exists oasis_catalogue_items (
  id uuid primary key default gen_random_uuid(),
  -- URL-safe handle, unique so a catalogue link stays stable even if the
  -- display name is edited later.
  slug text not null unique,
  name text not null,
  -- Short line under the name in the grid.
  tagline text,
  -- The long description shown when an item is expanded.
  info text,
  -- Cents, like everywhere else in this app — never floats for money.
  price_cents integer not null check (price_cents >= 0),
  -- Sizes offered, in the order they should be shown. An empty array
  -- means the item has no size choice (a print, a pin) and is ordered as-is.
  sizes text[] not null default '{}',
  -- Free-text grouping for the catalogue's filter row.
  category text not null default 'General',
  image_url text,
  -- What a buyer needs to know before committing: "Ships March 2027",
  -- "Made to order, 4-6 weeks".
  lead_time text,
  -- Hide an item without deleting it and losing its order history.
  available boolean not null default true,
  -- Manual ordering of the grid; ties fall back to name.
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists oasis_catalogue_items_available_idx
  on oasis_catalogue_items(available, sort_order);

-- A submitted pre-order. Not a payment: no Square order, no charge. The
-- account_code links it to an existing WHOA account when the person was
-- signed in — the one thing the catalogue shares with the rest of the site.
create table if not exists oasis_preorders (
  id uuid primary key default gen_random_uuid(),
  account_code text,
  name text not null,
  email text not null,
  phone text,
  note text,
  -- Denormalised on purpose: what the catalogue charged at the time. An
  -- item's price can change afterwards without rewriting history.
  total_cents integer not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists oasis_preorders_created_at_idx
  on oasis_preorders(created_at desc);

create table if not exists oasis_preorder_items (
  id uuid primary key default gen_random_uuid(),
  preorder_id uuid not null references oasis_preorders(id) on delete cascade,
  -- Kept as a plain reference rather than a foreign key: an item being
  -- retired from the catalogue must never delete or block an order that
  -- was already placed for it.
  item_slug text not null,
  -- Name, size and price as they were when the order was placed.
  item_name text not null,
  size text,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null default 1 check (quantity >= 1)
);

create index if not exists oasis_preorder_items_preorder_idx
  on oasis_preorder_items(preorder_id);

-- RLS: same posture as every other table here — service-role only, since
-- only this app's server code talks to Supabase.
alter table oasis_catalogue_items enable row level security;
alter table oasis_preorders enable row level security;
alter table oasis_preorder_items enable row level security;

-- Twelve placeholders so the catalogue has something to show. Safe to
-- re-run and safe to delete: `on conflict do nothing` keeps a second run
-- from duplicating them, and nothing in the app depends on these rows.
insert into oasis_catalogue_items
  (slug, name, tagline, info, price_cents, sizes, category, lead_time, sort_order)
values
  ('oasis-mirage-jacket', 'Mirage Jacket', 'Reversible desert shell',
   'Hand-finished reversible shell in sand and flame. Cut for layering over a hoodie, packs down into its own pocket.',
   18500, '{"S","M","L","XL"}', 'Outerwear', 'Made to order · 4-6 weeks', 10),
  ('oasis-sunfade-hoodie', 'Sunfade Hoodie', 'Garment-dyed, no two alike',
   'Heavyweight fleece, garment-dyed in small batches so every piece fades differently. Oversized fit.',
   11000, '{"S","M","L","XL","2XL"}', 'Tops', 'Ships March 2027', 20),
  ('oasis-dune-cargo', 'Dune Cargo Pant', 'Eight pockets, festival-tested',
   'Ripstop cargo with zip thigh pockets and an adjustable hem. Designed with the WHOA OASIS crew.',
   13500, '{"28","30","32","34","36"}', 'Bottoms', 'Made to order · 4-6 weeks', 30),
  ('oasis-heatwave-tee', 'Heatwave Tee', 'Screen-printed by hand',
   'Boxy cotton tee with a hand-pulled four-colour print. Print sits slightly differently on every shirt.',
   5500, '{"S","M","L","XL","2XL"}', 'Tops', 'Ships February 2027', 40),
  ('oasis-nightbloom-set', 'Nightbloom Set', 'Matching top and short',
   'Two-piece in a washed floral, made to be worn together or split apart. Runs true to size.',
   16000, '{"XS","S","M","L"}', 'Sets', 'Made to order · 6-8 weeks', 50),
  ('oasis-caravan-tote', 'Caravan Tote', 'Canvas, built to be abused',
   'Heavy canvas tote with an internal pocket and a strap long enough to wear across the body.',
   6500, '{}', 'Accessories', 'Ships February 2027', 60),
  ('oasis-solstice-bucket', 'Solstice Bucket Hat', 'Wide brim, packable',
   'Reversible bucket hat with a wider-than-usual brim. Crushes flat in a bag and springs back.',
   4500, '{"S/M","L/XL"}', 'Accessories', 'Ships February 2027', 70),
  ('oasis-ember-scarf', 'Ember Scarf', 'Hand-dyed silk',
   'Lightweight silk scarf, hand-dyed in a flame gradient. Every piece is one of one.',
   7500, '{}', 'Accessories', 'Made to order · 3-4 weeks', 80),
  ('oasis-afterglow-print', 'Afterglow Print', 'Numbered run of 50',
   'Giclée print on cotton rag, signed and numbered. Ships flat in a rigid mailer.',
   9000, '{"12x16","18x24"}', 'Art', 'Ships April 2027', 90),
  ('oasis-desert-pin-set', 'Desert Pin Set', 'Five enamel pins',
   'Five hard-enamel pins on a printed backing card. Sold only as a set.',
   3500, '{}', 'Art', 'Ships February 2027', 100),
  ('oasis-oasis-blanket', 'Oasis Blanket', 'Woven, oversized',
   'Cotton-blend woven blanket big enough for two. Fringed edges, gets softer with every wash.',
   14000, '{}', 'Home', 'Made to order · 6-8 weeks', 110),
  ('oasis-lantern-candle', 'Lantern Candle', 'Hand-poured, two scents',
   'Soy candle hand-poured into a reusable smoked-glass lantern. Roughly 50 hours of burn.',
   4000, '{"Smoke","Citrus"}', 'Home', 'Ships March 2027', 120)
on conflict (slug) do nothing;
