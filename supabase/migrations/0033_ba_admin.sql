-- BA ADMIN: the tab that manages every Brand Ambassador, and the record
-- of what they've actually been paid.
--
-- The gap this closes: ambassadors already stores WHERE to pay someone
-- (venmo or zelle, plus a destination), but nothing anywhere recorded
-- that a payment had happened. "Commission owed" was therefore a
-- lifetime total that only ever went up, no matter how many times
-- someone was paid. Owed is now earned minus paid, which is a number you
-- can act on.

alter table ambassadors
  add column if not exists perm_ba_admin boolean not null default false;

create table if not exists ambassador_payouts (
  id uuid primary key default gen_random_uuid(),
  ambassador_code text not null references ambassadors(code) on delete cascade,
  -- The month this settles, as YYYY-MM in Pacific time. Payouts run on
  -- the 1st for the month just ended, so a payout is never a loose
  -- payment against a running balance — it closes a specific period.
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'),
  -- Cents, like every other money column here. Never floats: a tenth of
  -- a cent of drift per row is a reconciliation argument later.
  amount_cents integer not null check (amount_cents > 0),
  -- How it was sent, as it was sent — not a join to the ambassador's
  -- current payout method, which they can change tomorrow. This is a
  -- receipt, and a receipt records what happened.
  method text not null,
  -- Whatever identifies it on the other side: a Venmo note, a Zelle
  -- confirmation, a cheque number.
  reference text,
  note text,
  paid_at timestamptz not null default now(),
  -- The account code of whoever recorded it, so a payout has an author.
  paid_by text,
  -- One payout per ambassador per month. This is the constraint that
  -- makes double-paying a period impossible rather than merely unlikely
  -- — two people working the pay run at once, a double-submitted form, a
  -- refreshed confirmation page all hit this instead of paying twice.
  unique (ambassador_code, period)
);

create index if not exists ambassador_payouts_code_idx
  on ambassador_payouts(ambassador_code, paid_at desc);

create index if not exists ambassador_payouts_period_idx
  on ambassador_payouts(period);

alter table ambassador_payouts enable row level security;
