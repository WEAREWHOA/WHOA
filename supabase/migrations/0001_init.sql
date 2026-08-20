-- WHOA Ambassador Program schema

create table if not exists ambassadors (
  code text primary key,
  name text not null,
  email text not null unique,
  instagram text,
  created_at timestamptz not null default now(),
  clicks integer not null default 0,
  payout_method text check (payout_method in ('paypal', 'venmo', 'bank')),
  payout_destination text
);

create table if not exists orders (
  id text primary key,
  ambassador_code text not null references ambassadors(code) on delete cascade,
  order_date timestamptz not null default now(),
  customer text not null,
  sale_amount numeric(10, 2) not null,
  commission numeric(10, 2) not null
);

create index if not exists orders_ambassador_code_idx on orders(ambassador_code);

create or replace function increment_ambassador_clicks(p_code text)
returns void
language sql
as $$
  update ambassadors set clicks = clicks + 1 where code = p_code;
$$;

-- RLS: this app talks to Supabase only from trusted server code (Server
-- Components, Server Actions, Route Handlers) using the service_role key,
-- which bypasses RLS. No client-side/anon access is expected, so no public
-- policies are defined — enabling RLS with zero policies blocks the anon
-- and authenticated roles entirely by default.
alter table ambassadors enable row level security;
alter table orders enable row level security;

-- Seed the demo ambassador used for exploring a populated portal.
insert into ambassadors (code, name, email, instagram, created_at, clicks, payout_method, payout_destination)
values (
  'WHOA-DEMO15',
  'Demo Ambassador',
  'demo@wearewhoa.art',
  '@whoa.demo',
  now() - interval '41 days',
  341,
  'paypal',
  'demo@wearewhoa.art'
)
on conflict (code) do nothing;

insert into orders (id, ambassador_code, order_date, customer, sale_amount, commission)
values
  ('ord_demo_1', 'WHOA-DEMO15', now() - interval '2 days', 'J. Alvarez', 68, 6.80),
  ('ord_demo_2', 'WHOA-DEMO15', now() - interval '5 days', 'R. Chen', 112, 11.20),
  ('ord_demo_3', 'WHOA-DEMO15', now() - interval '9 days', 'M. Osei', 54, 5.40),
  ('ord_demo_4', 'WHOA-DEMO15', now() - interval '14 days', 'T. Novak', 96, 9.60),
  ('ord_demo_5', 'WHOA-DEMO15', now() - interval '20 days', 'K. Ibrahim', 68, 6.80),
  ('ord_demo_6', 'WHOA-DEMO15', now() - interval '27 days', 'S. Park', 140, 14.00),
  ('ord_demo_7', 'WHOA-DEMO15', now() - interval '35 days', 'D. Reyes', 54, 5.40)
on conflict (id) do nothing;
