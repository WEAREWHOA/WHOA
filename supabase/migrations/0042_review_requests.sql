-- REVIEW REQUESTS: the email that asks, once, after the thing arrives.
--
-- One row per order, which is also the deduplication. Square fires
-- order.updated several times for a single order and retries anything it
-- gets a non-2xx for, so without a primary key on the order id a
-- customer would be asked for a review four times for one purchase.
--
-- The wait itself is Resend's. The email is handed over at the moment
-- the order is fulfilled with a scheduledAt in the future, so nothing
-- here has to poll, and there is no cron to forget to configure. What
-- this table records is that it was handed over, and to whom.

create table if not exists review_requests (
  -- Square's order id. Primary key on purpose: see above.
  order_id text primary key,

  -- Unguessable, and the whole proof of purchase. Somebody holding this
  -- bought the thing, so the review form can fill their email in and
  -- mark the review verified without asking Square again or trusting
  -- anything the browser says.
  token text not null unique,

  email text not null,
  customer_name text,

  -- PICKUP | SHIPMENT | DIGITAL | UNKNOWN. Kept because it decides the
  -- delay, and because "why did this go out six days later" is a
  -- question somebody will ask.
  fulfillment_type text,

  -- When Resend was told to send it. Not when it was sent.
  scheduled_for timestamptz not null,
  resend_email_id text,

  -- scheduled | failed
  status text not null default 'scheduled',

  -- The variation ids on the order, so a review arriving through this
  -- token can be checked against what was actually bought.
  variation_ids text[] not null default '{}',

  created_at timestamptz not null default now(),

  constraint review_requests_status_check check (status in ('scheduled', 'failed'))
);

-- The form looks a request up by token on every submission.
create index if not exists review_requests_token_idx on review_requests (token);

-- The tab lists recent requests newest first.
create index if not exists review_requests_created_idx on review_requests (created_at desc);

-- Row level security, as on every other table here. No policies: the app
-- reaches Supabase only through the service role key, which bypasses
-- RLS. This table holds a customer's email beside a token that proves
-- they bought something, so it is exactly the sort of thing an anon key
-- should never see.
alter table review_requests enable row level security;
