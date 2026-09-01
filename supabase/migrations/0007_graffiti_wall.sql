-- The WHOA Games graffiti wall — visitors draw on a canvas, it saves to a
-- public gallery. Strokes are stored as normalized point paths (jsonb),
-- not images, so this stays tiny to run: a whole drawing is a few KB of
-- coordinates, not a rasterized picture.

create table if not exists graffiti_drawings (
  id uuid primary key default gen_random_uuid(),
  strokes jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists graffiti_drawings_created_at_idx on graffiti_drawings(created_at desc);

-- RLS: same posture as every other table in this app — service-role-only
-- access, no public policies, since only trusted server code (this app's
-- server actions) talks to Supabase.
alter table graffiti_drawings enable row level security;
