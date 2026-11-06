-- WHERE WHOA HAS TURNED UP.
--
-- People send photographs of a sticker on a lamppost in Lisbon or a
-- hoodie on a street in Seoul. This is the map that holds them.
--
-- The important column is status. Everything arrives pending and
-- nothing reaches the public map until somebody has looked at it. A
-- public form that accepts a photograph and a place name and puts both
-- straight onto a page is an invitation, and the thing being invited is
-- not photographs of stickers. Moderation is not a feature to add later
-- here; it is the reason the table has a shape at all.

create table if not exists whoa_map_pins (
  id uuid primary key default gen_random_uuid(),

  -- What was spotted. Constrained in the database as well as in the
  -- form, because the form is not the only thing that can write here
  -- and a third kind appearing silently would break the map's legend.
  kind text not null check (kind in ('sticker', 'apparel')),

  -- Where, as the person typed it. Kept as text rather than resolved to
  -- somewhere canonical: it is what goes on the pin's label, and a
  -- geocoder's idea of a neighbourhood name is not what somebody wants
  -- to read about their own city.
  city text not null,
  -- Optional, because most of the world does not have states.
  region text,
  country text not null,

  -- Filled in by the geocoder when the pin is approved, not when it is
  -- submitted: it is one outbound request per pin and there is no sense
  -- spending it on something nobody has agreed to show yet. Null means
  -- not placed, and the map simply leaves those out rather than
  -- dropping them at zero degrees by zero degrees, which is in the
  -- Atlantic and looks like a bug because it is one.
  latitude double precision,
  longitude double precision,

  -- A name or a handle, whatever they want to be called. Never an
  -- email: this is shown on a public map, and a form that quietly
  -- publishes the address somebody typed is how you lose their trust
  -- once and permanently.
  uploaded_by text not null,

  photo_url text not null,
  photo_path text not null,

  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- The map's own query: approved, placed, newest first.
create index if not exists whoa_map_pins_approved_idx
  on whoa_map_pins (submitted_at desc)
  where status = 'approved' and latitude is not null;

-- The queue somebody works through.
create index if not exists whoa_map_pins_pending_idx
  on whoa_map_pins (submitted_at asc)
  where status = 'pending';

-- Same posture as every other table here: service_role only. Written by
-- server code holding the service key and by nothing else, which is
-- what stops the public form being a direct write to a public table.
alter table whoa_map_pins enable row level security;
