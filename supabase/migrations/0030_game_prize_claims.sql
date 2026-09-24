-- Prizes won in the games and the SSBD scavenger hunt.
--
-- Same posture as water_prize_claims: playing is anonymous and lives on
-- the device, but *claiming* needs an account. That's what makes one
-- person worth one prize however many times they play, and gives staff
-- something to check at the counter.
--
-- One table for every game rather than one per game: the prizes differ
-- only in which game issued them and what was picked.

create table if not exists game_prize_claims (
  id uuid primary key default gen_random_uuid(),
  account_code text not null,
  -- Which game issued it: 'snake', 'scavenger'.
  prize text not null,
  -- Read off someone's screen at the counter.
  code text not null unique,
  -- What they're owed, in the words staff will hand it over by:
  -- 'FREE STICKER' or 'H2WHOA WATER'.
  reward text not null,
  claimed_at timestamptz not null default now(),
  -- Set when staff actually hand it over, so a code can't be walked in
  -- twice. Null means issued but not yet collected.
  redeemed_at timestamptz,
  redeemed_by text,
  -- One prize per game per account. The constraint is the rule, not a
  -- hint: a second claim returns the first code rather than issuing
  -- another.
  unique (account_code, prize)
);

create index if not exists game_prize_claims_code_idx
  on game_prize_claims(code);

-- RLS: service-role only, same as every other table here.
alter table game_prize_claims enable row level security;
