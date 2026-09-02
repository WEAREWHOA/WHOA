-- CUSTOM DESIGN's bleach editor — a test of the submission pipeline, not
-- a live ordering flow yet (see README). Visitors pick one of four
-- black-only garment templates and "bleach" a design onto it with a
-- marker/spray brush, then submit contact info. Strokes are stored as
-- normalized point paths (jsonb), same posture as graffiti_drawings —
-- plus a rendered PNG preview so a submission is actually inspectable
-- without a staff-facing viewer that replays the stroke data.

create table if not exists custom_design_submissions (
  id uuid primary key default gen_random_uuid(),
  template_id text not null,
  strokes jsonb not null,
  preview_data_url text not null,
  name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_design_submissions_created_at_idx
  on custom_design_submissions(created_at desc);

-- RLS: same posture as every other table in this app — service-role-only
-- access, no public policies, since only trusted server code (this app's
-- server actions) talks to Supabase.
alter table custom_design_submissions enable row level security;
