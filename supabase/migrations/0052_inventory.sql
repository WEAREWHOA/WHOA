-- INVENTORY THAT WE OWN.
--
-- Stock has lived in Square and been mirrored here read-only
-- (square_inventory_counts). As Square moves out, this becomes the book
-- of record: the number the website sells against, the POS rings
-- against, and TikTok is told about.
--
-- Two tables and one function, and the function is the point. Every
-- change goes through adjust_stock and nowhere else, because the moment
-- a count can move by two routes the two routes disagree and a customer
-- finds out before we do.

create table if not exists stock (
  -- Square's variation id, kept as the key even as Square leaves. It is
  -- already the identifier in cart lines, order line items, the POS and
  -- the product feed; minting a second one now would mean migrating all
  -- of that in the same change as moving the inventory itself, which is
  -- two risks where one will do.
  variation_id text not null,
  location_id text not null,
  quantity integer not null default 0,

  -- False means unlimited, which is what a null count meant in Square
  -- and what lib/stock.ts already treats as available. Made-to-order
  -- pieces and anything not counted live here.
  tracked boolean not null default true,

  updated_at timestamptz not null default now(),
  primary key (variation_id, location_id)
);

-- Why a number is what it is.
--
-- Square kept this history and we are about to stop having it. Without
-- a ledger the only answer to "why does this say 3" is a shrug, and on
-- one-of-ones that question gets asked the first time a count looks
-- wrong.
create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  variation_id text not null,
  location_id text not null,
  -- Negative for a sale, positive for a return or a restock.
  delta integer not null,
  -- What the count became, so the ledger can be read without replaying
  -- every row before it.
  quantity_after integer not null,
  -- 'sale', 'pos', 'return', 'restock', 'count', 'tiktok', 'import'.
  -- Free text rather than an enum: a reason nobody anticipated should
  -- be recordable without a migration.
  reason text not null,
  -- The order, the ticket, the TikTok order id: whatever makes this
  -- traceable back to the thing that caused it.
  reference text,
  -- An account code, or null for the system.
  actor text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_variation_idx
  on stock_movements (variation_id, created_at desc);

create index if not exists stock_movements_reference_idx
  on stock_movements (reference)
  where reference is not null;

/*
 * The only way a count moves.
 *
 * Atomic on purpose. Reading a count, deciding in application code and
 * writing it back is the classic way to sell the last of something
 * twice: two requests both read 1, both decide yes, both write 0. Here
 * the read, the decision and the write are one statement, so the second
 * one loses.
 *
 * Returns the resulting quantity and whether it was applied, rather
 * than raising. A refused sale is an ordinary outcome that the caller
 * has to tell a customer about, not an exception.
 *
 * An untracked variation always applies and stays untracked: it is
 * unlimited, and counting down from zero would make it look sold out.
 */
create or replace function adjust_stock(
  p_variation_id text,
  p_location_id text,
  p_delta integer,
  p_reason text,
  p_reference text default null,
  p_actor text default null
)
returns table (quantity integer, tracked boolean, applied boolean)
language plpgsql
as $$
declare
  v_row stock%rowtype;
begin
  -- Create the row if this variation has never been counted, so a first
  -- sale does not need a separate setup step. Locked for the rest of
  -- the transaction by the update below.
  insert into stock (variation_id, location_id, quantity)
  values (p_variation_id, p_location_id, 0)
  on conflict (variation_id, location_id) do nothing;

  update stock s
     set quantity = case when s.tracked then s.quantity + p_delta else s.quantity end,
         updated_at = now()
   where s.variation_id = p_variation_id
     and s.location_id = p_location_id
     -- The condition that makes this safe. A decrement only lands if
     -- there is enough to take; an increment always does.
     and (not s.tracked or s.quantity + p_delta >= 0)
  returning s.* into v_row;

  if not found then
    -- Refused. Report what is actually there so the caller can say
    -- "only two left" rather than "no".
    select * into v_row from stock
     where variation_id = p_variation_id and location_id = p_location_id;
    return query select v_row.quantity, v_row.tracked, false;
    return;
  end if;

  -- Only movements that happened are recorded, and an untracked
  -- variation records none: its number never moved.
  if v_row.tracked and p_delta <> 0 then
    insert into stock_movements
      (variation_id, location_id, delta, quantity_after, reason, reference, actor)
    values
      (p_variation_id, p_location_id, p_delta, v_row.quantity, p_reason, p_reference, p_actor);
  end if;

  return query select v_row.quantity, v_row.tracked, true;
end;
$$;

/*
 * Setting a count outright, for a stocktake or a correction.
 *
 * Separate from adjust_stock because it is a different act: a delta
 * says what happened, a set says what is true regardless of what we
 * thought. The ledger records the difference so the correction is
 * visible rather than silent.
 */
create or replace function set_stock(
  p_variation_id text,
  p_location_id text,
  p_quantity integer,
  p_tracked boolean,
  p_reason text,
  p_actor text default null
)
returns table (quantity integer, tracked boolean, applied boolean)
language plpgsql
as $$
declare
  v_before integer;
  v_after stock%rowtype;
begin
  select s.quantity into v_before from stock s
   where s.variation_id = p_variation_id and s.location_id = p_location_id;

  insert into stock (variation_id, location_id, quantity, tracked, updated_at)
  values (p_variation_id, p_location_id, greatest(p_quantity, 0), p_tracked, now())
  on conflict (variation_id, location_id) do update
    set quantity = greatest(excluded.quantity, 0),
        tracked = excluded.tracked,
        updated_at = now()
  returning * into v_after;

  if p_tracked and coalesce(v_before, 0) <> v_after.quantity then
    insert into stock_movements
      (variation_id, location_id, delta, quantity_after, reason, actor)
    values
      (p_variation_id, p_location_id, v_after.quantity - coalesce(v_before, 0),
       v_after.quantity, p_reason, p_actor);
  end if;

  return query select v_after.quantity, v_after.tracked, true;
end;
$$;

-- Same posture as every other table here: service_role only, no public
-- policies. Stock is written by server code holding the service key and
-- by nothing else.
alter table stock enable row level security;
alter table stock_movements enable row level security;
