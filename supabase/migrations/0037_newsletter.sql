-- NEWSLETTER: the portal tab, and a local mirror of the Resend list.
--
-- Resend owns whether someone is subscribed. Every broadcast it sends
-- carries its own unsubscribe link, and clicking it flips the flag on
-- Resend's contact record without telling us -- so if this table claimed
-- to know, we would eventually email someone who had opted out. That is
-- a CAN-SPAM violation rather than a bug, which is why there is no
-- `unsubscribed` column here: the tab reads that from Resend every time.
--
-- What this table is for is the two things Resend does not store: where
-- a subscriber came from, and which WHOA account they belong to.

alter table ambassadors
  add column if not exists perm_newsletter boolean not null default false;

create table if not exists newsletter_subscribers (
  -- The address is the identity, lowercased by the application before it
  -- ever reaches here, so "Sam@Example.com" and "sam@example.com" can
  -- never become two subscribers.
  email text primary key,
  first_name text,
  last_name text,
  -- events | footer | checkout | import | pos. Free text rather than an
  -- enum so adding a signup point is an application change, not a
  -- migration during a campaign.
  source text,
  -- Null for someone who signed up without an account, which is most of
  -- them. Not a foreign key: deleting an account should not quietly
  -- delete someone's subscription, and the address stands on its own.
  account_code text,
  created_at timestamptz not null default now()
);

-- The tab lists newest first and filters by source; both are index-worthy
-- on a list that only grows.
create index if not exists newsletter_subscribers_created_at_idx
  on newsletter_subscribers (created_at desc);
create index if not exists newsletter_subscribers_source_idx
  on newsletter_subscribers (source);
