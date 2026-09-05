-- "ART COLLECTIVE" — self-service artist onboarding with a real product
-- pipeline into Square, separate from the existing static-file
-- ARTIST/VENDOR system (lib/artists.ts + vendor_slug) which stays as-is
-- for already-curated artists.
alter table ambassadors add column if not exists perm_art boolean not null default false;
-- Reviews submitted products — a distinct permission from perm_art itself
-- (an artist doesn't get to approve their own submissions). Super Admins
-- always have this, same as perm_events_admin.
alter table ambassadors add column if not exists perm_art_admin boolean not null default false;

-- The artist's own editable profile — same shape/posture as
-- musician_profiles (0017): populated (pending) at application time,
-- edited from the ART tab once approved.
create table if not exists art_profiles (
  ambassador_code text primary key references ambassadors(code) on delete cascade,
  artist_name text not null,
  medium text,
  tagline text,
  bio text,
  profile_image_url text,
  -- [{ "label": "Instagram", "url": "https://..." }, ...]
  links jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per submitted product (up to 5 at a time from the ART tab,
-- grouped by batch_id so "approve all" and the admin/email view can treat
-- a submission as one unit while still allowing individual approval).
-- Approving pushes it into Square Catalog for real —
-- square_catalog_object_id is set once that happens, so it also doubles
-- as this table's "is this actually live" flag.
create table if not exists art_products (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null default gen_random_uuid(),
  ambassador_code text not null references ambassadors(code) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  size text,
  details text,
  -- Supabase Storage public URLs (see the art-photos bucket below).
  photo_urls jsonb not null default '[]',
  -- The required "also submit for retail store / events" choice — true
  -- means the artist also wants physical units stocked/brought by staff,
  -- on top of the online store listing every approved product gets
  -- regardless. Purely informational for staff, not a catalog visibility
  -- flag (there's no such thing as "hide from in-person POS" in Square's
  -- model once an item is present at a location).
  also_retail_events boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  square_catalog_object_id text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists art_products_code_idx on art_products(ambassador_code);
create index if not exists art_products_batch_idx on art_products(batch_id);
create index if not exists art_products_status_idx on art_products(status);

alter table art_profiles enable row level security;
alter table art_products enable row level security;

-- Public bucket for profile photos and submitted product photos, uploaded
-- server-side with the service_role key (which bypasses storage RLS the
-- same way it bypasses table RLS) — no storage policies needed. If your
-- Supabase project's storage schema rejects this insert (schema shape can
-- vary by project age), create the bucket by hand instead: Dashboard →
-- Storage → New bucket → name `art-photos` → Public bucket: on.
insert into storage.buckets (id, name, public)
values ('art-photos', 'art-photos', true)
on conflict (id) do nothing;
