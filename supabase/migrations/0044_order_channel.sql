-- WHERE AN ORDER CAME FROM.
--
-- The square_orders mirror has never recorded this, so the ANALYTICS tab
-- could report revenue but not online revenue, and a storefront sale and
-- a sale rung up at a pop-up were one indistinguishable number. They are
-- the two halves of the business and they respond to completely
-- different things, so one figure covering both is the least useful shape
-- the data could take.
--
-- Square does not have an "online or in person" field to copy. What it
-- has is the fulfillment: our storefront checkout attaches a SHIPMENT to
-- every order it creates, because it has an address to ship to, and the
-- POS register attaches nothing, because the customer is standing there.
-- So the fulfillment type IS the channel, and it is recorded as both:
-- the raw type, which is Square's fact, and a derived channel, which is
-- our reading of it. Keeping the raw value means a later disagreement
-- about the reading can be settled without a resync.
alter table square_orders
  -- Square's own value: SHIPMENT | DELIVERY | PICKUP | IN_STORE, or null.
  -- Null means Square reported no fulfillment at all, which is what a
  -- sale rung up at the register looks like.
  add column if not exists fulfillment_type text,
  -- online | in_person | unknown, derived from the type above.
  --   online      SHIPMENT or DELIVERY, both of which need an address,
  --               and only a web order collects one
  --   in_person   no fulfillment, or IN_STORE
  --   unknown     PICKUP, which genuinely covers both a web order
  --               somebody collects and a counter sale rung up for
  --               later. Left unsplit rather than guessed: a wrong
  --               split is worse than an honest gap.
  -- Null is NOT unknown. Null means the row predates this migration and
  -- nobody has looked yet. The analytics tab counts those separately, so
  -- a half-backfilled table cannot quietly understate online sales.
  add column if not exists channel text;

alter table square_orders
  drop constraint if exists square_orders_channel_check;
alter table square_orders
  add constraint square_orders_channel_check
  check (channel is null or channel in ('online', 'in_person', 'unknown'));

-- The tab splits revenue by channel over a date window, so the two
-- columns are read together.
create index if not exists square_orders_channel_idx
  on square_orders (channel, created_at desc);

-- Backfilling history needs a re-run of the order backfill, which walks
-- every order Square has and upserts it:
--
--   POST /api/admin/square/backfill
--
-- Until that runs, existing rows keep channel null and the tab reports
-- how many are unclassified instead of counting them as in-person.
