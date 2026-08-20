-- Password auth + multi-link tracking

alter table ambassadors add column if not exists password_hash text;

create table if not exists sessions (
  token text primary key,
  ambassador_code text not null references ambassadors(code) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists links (
  id text primary key,
  ambassador_code text not null references ambassadors(code) on delete cascade,
  label text not null,
  slug text not null unique,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sessions_ambassador_code_idx on sessions(ambassador_code);
create index if not exists links_ambassador_code_idx on links(ambassador_code);

create or replace function increment_link_clicks(p_slug text)
returns void
language sql
as $$
  update links set clicks = clicks + 1 where slug = p_slug;
$$;

-- RLS: same posture as 0001_init.sql — service_role-only access, no public
-- policies, since this app only ever talks to Supabase from trusted server
-- code.
alter table sessions enable row level security;
alter table links enable row level security;

-- Give the demo ambassador a password and a default trackable link so the
-- seeded WHOA-DEMO15 account can log in and show a populated links list.
-- Demo password: whoa-demo-2026
update ambassadors
set password_hash = '$2b$10$z7afgxuwrqdYdpFFJgTAgev0Jz0XGBl2bfFMfsfyC.U9Bs6ZmMzg.'
where code = 'WHOA-DEMO15';

insert into links (id, ambassador_code, label, slug, clicks, created_at)
values ('link_demo_default', 'WHOA-DEMO15', 'Default', 'WHOA-DEMO15', 341, now() - interval '41 days')
on conflict (id) do nothing;
