-- Lets an artist ask to change or pull a product that's already approved.
--
-- Until now approval was one-way: once a product was live in Square, the
-- artist who submitted it had no way to fix a typo, correct a price, or
-- take it down — they had to ask a human, out of band. But an approved
-- product is a real listing in a real shop, so an artist can't be allowed
-- to edit it unilaterally either. Hence a request: the artist proposes,
-- staff approve, and only then does anything reach Square.
--
-- Kept on art_products rather than in a table of its own. A product can
-- have at most one open request at a time — a second "actually, make it
-- $30" should replace the first rather than queue behind it — and that
-- constraint is free when the request lives on the row it's about.

alter table art_products
  -- Null means no open request. 'edit' carries proposed values in
  -- pending_changes; 'removal' asks for the listing to come down.
  add column if not exists pending_action text
    check (pending_action is null or pending_action in ('edit', 'removal')),
  -- Only the fields the artist actually wants changed, as
  -- {name, description, price_cents, size, details}. Applied over the row
  -- on approval, so an untouched field stays exactly as it was rather than
  -- being overwritten with a stale copy.
  add column if not exists pending_changes jsonb,
  -- The artist's own words about why — the thing that lets staff approve
  -- without a separate conversation.
  add column if not exists pending_note text,
  add column if not exists pending_requested_at timestamptz;

create index if not exists art_products_pending_action_idx
  on art_products(pending_action)
  where pending_action is not null;

-- An approved product that's been taken down is neither 'approved' (it
-- isn't live) nor 'declined' (it was, once, and its sales history is real),
-- so it needs a status of its own. The check constraint has to be replaced
-- rather than added to; its name is Postgres's default for an inline check
-- on this table, so look it up rather than assuming.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  where con.conrelid = 'art_products'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%status%'
    and pg_get_constraintdef(con.oid) not like '%removed%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table art_products drop constraint %I', constraint_name);
    execute 'alter table art_products add constraint art_products_status_check
      check (status in (''pending'', ''approved'', ''declined'', ''removed''))';
  end if;
end $$;
