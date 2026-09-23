-- Claimed H2WHOA bottle prizes.
--
-- The spin itself stays on the device (it's a bit of fun and shouldn't
-- need an account), but *claiming* a win does need one. This table is
-- what makes the prize real: one row per account, so the same person
-- can't collect a sticker from every bottle they pick up, and staff at
-- the WHOAdega have something to check a code against.

create table if not exists water_prize_claims (
  id uuid primary key default gen_random_uuid(),
  -- One prize per account. The unique constraint is the rule, not a hint:
  -- a second claim returns the first code rather than issuing another.
  account_code text not null unique,
  -- Shown on screen and read out at the counter.
  code text not null unique,
  claimed_at timestamptz not null default now(),
  -- Set when staff actually hand the sticker over, so a code can't be
  -- walked in twice. Null means issued but not yet collected.
  redeemed_at timestamptz,
  redeemed_by text
);

create index if not exists water_prize_claims_code_idx
  on water_prize_claims(code);

-- RLS: service-role only, same as every other table here.
alter table water_prize_claims enable row level security;
