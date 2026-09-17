-- /contact's message form.
--
-- This is the browsable copy, not the delivery mechanism: every message
-- is also emailed to info@wearewhoa.com, and lib/contact.ts treats the two
-- as independent, so a submission still reaches a person if this table is
-- missing. Running this migration is what gets staff the searchable
-- history alongside the inbox.
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on contact_messages(created_at desc);

-- RLS: same posture as every other table in this app — service-role-only
-- access, no public policies, since only trusted server code (this app's
-- server actions) talks to Supabase.
alter table contact_messages enable row level security;
