-- The Creation Station scavenger card.
--
-- Every sticker in Creation Station carries the same printed URL (/go),
-- so a row cannot record which sticker was scanned — only that a stamp
-- was earned. slot therefore holds the square's ordinal ('slot-1' …
-- 'slot-6'), filled in order.
--
-- The unique index is still what keeps the card honest about its own
-- count: it caps an account at six rows and stops a double-tapped button
-- becoming two stamps. The spacing between stamps is enforced in
-- lib/scavenger.ts, from stamped_at.

create table if not exists scavenger_stamps (
  id uuid primary key default gen_random_uuid(),
  account_code text not null,
  slot text not null,
  stamped_at timestamptz not null default now(),
  unique (account_code, slot)
);

create index if not exists scavenger_stamps_account_idx
  on scavenger_stamps(account_code);

alter table scavenger_stamps enable row level security;
