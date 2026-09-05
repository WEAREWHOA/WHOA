-- Backs "Join our Music Collective" (app/music-collective/apply) and the
-- portal's Music tab. perm_music (already on ambassadors) is the approval
-- gate; this table is the profile itself, editable from the Music tab once
-- approved, and already populated (in a pending state) at application time
-- so nothing is retyped after approval.
create table if not exists musician_profiles (
  ambassador_code text primary key references ambassadors(code) on delete cascade,
  artist_name text not null,
  subgenre text,
  tagline text,
  bio text,
  -- [{ "label": "Spotify", "url": "https://..." }, ...]
  links jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table musician_profiles enable row level security;
