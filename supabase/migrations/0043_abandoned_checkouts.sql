-- ABANDONED CHECKOUTS: the basket somebody filled in and walked away from.
--
-- This is the first thing on the site that stores a stranger's email
-- before they have bought anything. That is a real change in what we
-- collect, so the shape of the table follows from it:
--
--   One row per person, keyed on their address, so repeatedly editing a
--   checkout updates one row rather than piling up a record of every
--   keystroke session.
--
--   The basket is a snapshot, not a reference. What they had in the cart
--   at that moment is the thing the reminder is about, and a product
--   selling out afterwards must not rewrite history.
--
--   recovered_at is set the moment an order completes, and the reminder
--   is cancelled at Resend in the same breath. Emailing somebody about a
--   cart they already bought is worse than not emailing them at all.
--
-- The wait is Resend's again: the reminder is scheduled an hour out when
-- the address is captured, and pushed back every time they touch the
-- form, so nobody is emailed while they are still typing.

create table if not exists abandoned_checkouts (
  -- Lowercased by the application before it ever reaches here.
  email text primary key,
  customer_name text,

  -- A snapshot of the cart: product name, variation, price and quantity
  -- as they stood. Enough to write the email and rebuild the basket from
  -- a link without asking the catalogue what things cost now.
  lines jsonb not null default '[]'::jsonb,
  subtotal_cents integer not null default 0,

  -- Set when they were signed in. Most are not.
  account_code text,

  -- Resend's id for the scheduled reminder, so it can be pushed back
  -- while they are still typing and cancelled when they buy.
  reminder_email_id text,
  reminder_scheduled_for timestamptz,

  -- Set on a completed order. A row with this set is history, not a
  -- queue entry.
  recovered_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The tab and any cleanup both read "recent, not yet recovered".
create index if not exists abandoned_checkouts_open_idx
  on abandoned_checkouts (updated_at desc)
  where recovered_at is null;

-- Row level security, as on every other table here. No policies: the app
-- reaches Supabase only through the service role key, which bypasses
-- RLS. This table is a list of people who nearly bought something, with
-- their address and what they wanted, which is about as sensitive as
-- anything in this database.
alter table abandoned_checkouts enable row level security;
