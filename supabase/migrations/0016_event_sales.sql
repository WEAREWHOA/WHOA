-- Backs "SELL FOR US" (app/sell-for-us) — event/festival sales crew,
-- separate from the Brand Ambassador program. perm_event_sales gates the
-- portal's EVENT SALES tab, same pattern as every other perm_* column.
alter table ambassadors add column if not exists perm_event_sales boolean not null default false;

-- A durable record of every "SELL FOR US" submission, for staff reference
-- alongside the notification email — approval itself is just flipping
-- perm_event_sales on for ambassador_code (from Super Admin), same as any
-- other permission.
create table if not exists event_sales_applications (
  id uuid primary key default gen_random_uuid(),
  ambassador_code text not null references ambassadors(code) on delete cascade,
  name text not null,
  email text not null,
  phone text not null,
  instagram text,
  message text,
  created_at timestamptz not null default now()
);
create index if not exists event_sales_applications_code_idx on event_sales_applications(ambassador_code);

-- One row per (account, event) request to work a specific event/festival,
-- reviewed from the EVENTS ADMIN tab. An approved row is what "the
-- schedule" (the EVENT SALES tab) is built from.
create table if not exists event_sales_signups (
  id uuid primary key default gen_random_uuid(),
  ambassador_code text not null references ambassadors(code) on delete cascade,
  event_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (ambassador_code, event_id)
);
create index if not exists event_sales_signups_code_idx on event_sales_signups(ambassador_code);
create index if not exists event_sales_signups_status_idx on event_sales_signups(status);

alter table event_sales_applications enable row level security;
alter table event_sales_signups enable row level security;
