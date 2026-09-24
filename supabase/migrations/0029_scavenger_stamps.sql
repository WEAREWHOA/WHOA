-- The Creation Station scavenger card.
--
-- Six stickers are spread around Creation Station. Each one carries its
-- own token (see SCAVENGER_SLOTS in lib/scavenger.ts) and stamps its own
-- square on the card, which is what makes "six different scans" mean six
-- different stickers rather than one sticker scanned six times.
--
-- One row per account per slot, so a re-scan of a sticker already found
-- is a no-op rather than a second stamp.

create table if not exists scavenger_stamps (
  id uuid primary key default gen_random_uuid(),
  account_code text not null,
  -- The slot id, not the token: tokens can be reprinted without
  -- invalidating stamps people have already earned.
  slot text not null,
  stamped_at timestamptz not null default now(),
  unique (account_code, slot)
);

create index if not exists scavenger_stamps_account_idx
  on scavenger_stamps(account_code);

alter table scavenger_stamps enable row level security;
