-- Square catalog/inventory/orders sync mirror.
--
-- Square stays the system of record for POS, checkout, and payments. These
-- tables are a read-optimized mirror kept in sync via /api/webhooks/square
-- (near-real-time) and a one-time backfill script (historical data), so the
-- app can read fast without hitting Square's API on every request.

create table if not exists square_products (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  -- Which artist/vendor this product belongs to. Nullable for now — the
  -- artist-matching pass (parsing the vendor name out of the product name)
  -- is a separate follow-up step.
  owner_code text,
  updated_at timestamptz not null default now()
);

create table if not exists square_product_variations (
  id text primary key,
  product_id text not null references square_products(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists square_product_variations_product_id_idx
  on square_product_variations(product_id);

create table if not exists square_inventory_counts (
  variation_id text not null references square_product_variations(id) on delete cascade,
  location_id text not null,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (variation_id, location_id)
);

create table if not exists square_orders (
  id text primary key,
  location_id text not null,
  state text,
  total_money_cents integer not null default 0,
  created_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists square_order_line_items (
  -- Square line item `uid`s are only unique within their order, so this is
  -- synthesized as "<order_id>_<uid>" rather than using Square's own id.
  id text primary key,
  order_id text not null references square_orders(id) on delete cascade,
  catalog_object_id text,
  name text,
  quantity numeric not null default 1,
  total_money_cents integer not null default 0
);

create index if not exists square_order_line_items_order_id_idx
  on square_order_line_items(order_id);
create index if not exists square_order_line_items_catalog_object_id_idx
  on square_order_line_items(catalog_object_id);

-- RLS: same posture as every other table in this app — service-role-only
-- access, no public policies, since only trusted server code talks to
-- Supabase.
alter table square_products enable row level security;
alter table square_product_variations enable row level security;
alter table square_inventory_counts enable row level security;
alter table square_orders enable row level security;
alter table square_order_line_items enable row level security;
