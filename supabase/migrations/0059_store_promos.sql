-- STORE PROMO CODES, AND WHAT HAPPENS WHEN ONE BEATS A BA'S.
--
-- Until now "promo code" meant one thing on this site: an ambassador's
-- own code, which is a row in links. Typing it at checkout sets the
-- referral cookie and takes 15% off. There was no such thing as a code
-- WHOA itself issues.
--
-- This is that second kind. A sale: BLACKFRIDAY, 25% off, for a week.
--
-- The rule when a customer has both, which is the whole reason this
-- table exists:
--
--   The customer gets whichever discount is worth more. Never both.
--   The ambassador is still credited with the sale and still earns
--   commission, even though their discount was not the one used.
--
-- That second line is the point. Somebody who found WHOA through a
-- BA's link and then typed a better code at checkout was still brought
-- here by that BA, and the BA should not lose the sale because the
-- customer found a better deal. Attribution and discount are two
-- different questions and this schema keeps them apart: nothing in
-- this table touches the orders table or the commission, which carry
-- on being decided by the referral cookie exactly as before.
--
-- PERCENTAGES ONLY, deliberately.
--
--   Square distributes a fixed-amount discount correctly only when it
--   is scoped to the whole order, and an order-scoped discount would
--   also come off the consignment and Art Collective pieces that carry
--   the 🚫 marker, which are not ours to discount. A line-item scoped
--   percentage applies to exactly the items we choose, which is the
--   mechanism the ambassador discount already uses in production.
--   A "$10 off" code needs different plumbing and is not pretended to
--   work here.

create table if not exists store_promos (
  -- Upper-cased by the app before it ever gets here, like links.slug,
  -- so a customer typing lower case still matches.
  code text primary key,

  percent integer not null check (percent > 0 and percent <= 100),

  -- What the customer sees next to the discount on the checkout.
  -- "Black Friday" reads better than "BLACKFRIDAY25" on a receipt.
  label text,

  -- Null at either end means open-ended. A sale with no end date is a
  -- price change, so the admin side should push back on that, but the
  -- schema allows it because a permanent code is a real thing.
  starts_at timestamptz,
  ends_at timestamptz,

  -- Null means unlimited. A cap is checked when the code is typed and
  -- counted when the sale completes, so two people checking out in the
  -- same second can both take the last one. That is a deliberate
  -- trade: the alternative is holding a claim across a card payment
  -- and releasing it if the card declines, which turns every promo
  -- checkout into a distributed transaction to save at most a couple
  -- of overshoots on a number WHOA picked arbitrarily anyway.
  max_redemptions integer check (max_redemptions > 0),
  redemptions integer not null default 0 check (redemptions >= 0),

  -- The off switch, separate from the dates, because the reason to
  -- stop a code early is usually that something is wrong with it and
  -- nobody wants to edit a date under pressure.
  active boolean not null default true,

  created_at timestamptz not null default now(),
  created_by text,
  note text
);

-- The admin list: live codes first.
create index if not exists store_promos_active_idx
  on store_promos (created_at desc)
  where active;

-- Count a use.
--
-- Always increments, even past the cap, because the counter is a
-- record of what happened and the sale has already been paid for by
-- the time this is called. within_cap is returned so an overshoot gets
-- logged rather than silently absorbed.
create or replace function record_store_promo_use(p_code text)
returns table (redemptions integer, within_cap boolean)
language plpgsql
as $$
declare
  v_promo store_promos%rowtype;
begin
  update store_promos p
     set redemptions = p.redemptions + 1
   where p.code = upper(p_code)
  returning p.* into v_promo;

  if not found then
    return query select 0, false;
    return;
  end if;

  return query select
    v_promo.redemptions,
    v_promo.max_redemptions is null or v_promo.redemptions <= v_promo.max_redemptions;
end;
$$;

-- Service role only, like every other table here. A browser that could
-- write this table could invent itself a 100% off code.
alter table store_promos enable row level security;
