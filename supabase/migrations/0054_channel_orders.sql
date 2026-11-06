-- HEARING BACK.
--
-- 0053 tells the other shops what we have. This is the direction that
-- was missing, and without it the sync is worse than nothing: TikTok
-- takes an order, our table never hears, and the next push sets
-- TikTok's count back up to the number we still wrongly believe. The
-- shop then sells something that is gone, which is the exact failure
-- the whole arrangement exists to prevent.
--
-- So a sale on TikTok has to come back in and move stock here, the same
-- way a sale on our own site will. Then the push that follows carries a
-- number both sides already agree on, and the loop settles instead of
-- fighting itself.

-- Which orders we have already counted.
--
-- Order webhooks are delivered at least once, not exactly once: the
-- same order arrives again on a retry, on a status change, and
-- sometimes for no reason at all. Without this, every redelivery takes
-- the stock down again and a popular item walks to zero on its own.
--
-- A table rather than a constraint on stock_movements, because that
-- table legitimately holds two rows with one reference: an order with
-- the same variation on two lines, and a sale and its later return.
create table if not exists channel_orders (
  channel text not null,
  external_order_id text not null,
  claimed_at timestamptz not null default now(),
  primary key (channel, external_order_id)
);

-- True the first time, false every time after.
--
-- The insert is the claim. Checking for the row and then inserting it
-- would be the same read-then-write race that adjust_stock exists to
-- close, and two deliveries of one order arriving together is exactly
-- when it would bite.
create or replace function claim_channel_order(
  p_channel text,
  p_external_order_id text
)
returns boolean
language plpgsql
as $$
begin
  insert into channel_orders (channel, external_order_id)
  values (p_channel, p_external_order_id)
  on conflict do nothing;

  return found;
end;
$$;

alter table channel_orders enable row level security;
