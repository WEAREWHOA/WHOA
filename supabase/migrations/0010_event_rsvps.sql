-- Real RSVP/ticket records for events (lib/events.ts's static EVENTS
-- array), so a signed-in account's portal can show what they've RSVP'd to
-- or bought a ticket for. event_id is a plain text reference to
-- EVENTS[].id rather than a foreign key, since the event catalog itself
-- isn't in the database — it's static content in the app.

create table if not exists event_rsvps (
  id text primary key,
  event_id text not null,
  -- Nullable: a guest can RSVP/buy a ticket without creating an account,
  -- same as shop checkout. Only linked records show up in a portal.
  account_code text references ambassadors(code) on delete set null,
  name text not null,
  email text not null,
  phone text,
  -- 0 for a free RSVP, >0 for a paid ticket — mirrors event.priceCents at
  -- the time of purchase rather than looking it up live, so a later price
  -- change doesn't rewrite history.
  price_cents integer not null default 0,
  square_order_id text,
  square_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists event_rsvps_account_code_idx on event_rsvps(account_code);
create index if not exists event_rsvps_event_id_idx on event_rsvps(event_id);

-- RLS: same posture as every other table here — service-role-only access
-- from trusted server code, no public policies.
alter table event_rsvps enable row level security;
