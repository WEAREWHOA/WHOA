-- TELLING THE OTHER SHOPS.
--
-- 0052 made stock the book of record. This is the half that leaves:
-- when a count changes here, the shops that sell the same thing
-- elsewhere have to hear about it, and TikTok is the first of them.
--
-- The design question is where the outbound write happens. Doing it in
-- application code means every path that moves stock has to remember
-- to, and one that forgets oversells a one-of-one on TikTok with no
-- trace of why. So it happens in the database, in the same transaction
-- as the change itself: if the count moved, the push is queued, and
-- there is no ordering in which one happens without the other.

-- What a variation is called somewhere else.
--
-- Empty until a channel is actually connected, which is what makes the
-- rest of this inert rather than a queue filling up for nobody. One row
-- per variation per channel; a variation we do not list on TikTok
-- simply has no row and is never queued.
create table if not exists channel_listings (
  channel text not null,
  variation_id text not null,
  -- TikTok's sku_id. Their product id is the parent; stock is set per
  -- sku, so this is the one that matters.
  external_id text not null,
  external_product_id text,
  created_at timestamptz not null default now(),
  primary key (channel, variation_id)
);

-- What still needs saying.
--
-- A queue of the current number rather than a log of changes. If a
-- count moves five times before anything drains this, the fifth number
-- is the only one worth sending and the first four are noise that would
-- arrive out of order anyway. The partial unique index below is what
-- makes that collapse automatic instead of something the drain has to
-- work out.
create table if not exists stock_sync_queue (
  id bigserial primary key,
  channel text not null,
  variation_id text not null,
  location_id text not null,
  quantity integer not null,
  tracked boolean not null default true,
  queued_at timestamptz not null default now(),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz
);

create unique index if not exists stock_sync_queue_pending
  on stock_sync_queue (channel, variation_id, location_id)
  where sent_at is null;

create index if not exists stock_sync_queue_unsent
  on stock_sync_queue (queued_at)
  where sent_at is null;

-- The trigger. One pending row per listing, always holding the latest
-- number, attempts reset because this is a new fact rather than a retry
-- of the old one.
create or replace function queue_stock_sync() returns trigger
language plpgsql
as $$
begin
  -- Only when the number or its meaning actually moved. set_stock runs
  -- on every Square mirror pass, and most of those change nothing; the
  -- queue should not fill with the news that nothing happened.
  if tg_op = 'UPDATE'
     and new.quantity is not distinct from old.quantity
     and new.tracked is not distinct from old.tracked then
    return new;
  end if;

  insert into stock_sync_queue (channel, variation_id, location_id, quantity, tracked)
  select l.channel, new.variation_id, new.location_id, new.quantity, new.tracked
    from channel_listings l
   where l.variation_id = new.variation_id
  on conflict (channel, variation_id, location_id) where sent_at is null
  do update set quantity = excluded.quantity,
                tracked = excluded.tracked,
                queued_at = now(),
                attempts = 0,
                last_error = null;

  return new;
end;
$$;

drop trigger if exists stock_queue_sync on stock;
create trigger stock_queue_sync
  after insert or update on stock
  for each row execute function queue_stock_sync();

alter table channel_listings enable row level security;
alter table stock_sync_queue enable row level security;
