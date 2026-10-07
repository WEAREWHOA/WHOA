-- WHICH OF THE THREE EMAILS SOMEBODY ACTUALLY WANTS.
--
-- Until now the list was one switch: subscribed, or not. That is fine
-- while there is one email. With three going out on three rhythms it
-- stops being fine quickly, because the only way to stop the one you
-- find too frequent is to stop all of them. A weekly events email is the
-- obvious candidate, and losing somebody from the monthly drops list
-- because the weekly was too much is an expensive way to find that out.
--
-- So each list gets its own flag, and `status` keeps its job unchanged:
-- it says whether we may mail this person AT ALL. A `status` of
-- unsubscribed or cleaned overrides every flag below, because those are
-- the person telling us to stop and the mailbox telling us it is gone,
-- and a per-list preference is not permission to ignore either.
--
-- Default true, on purpose. Everybody already on the list opted into
-- "the WHOA newsletter" when the newsletter was all three of these
-- things, so defaulting them off would silently empty the lists the day
-- this ships. Somebody who wants less can now say so precisely, which is
-- the entire point.

alter table newsletter_subscribers
  -- Weekly, what is on this week.
  add column if not exists sub_events_weekly boolean not null default true,
  -- Monthly, what dropped.
  add column if not exists sub_drops_monthly boolean not null default true,
  -- Monthly, the longer read.
  add column if not exists sub_newsletter_monthly boolean not null default true,
  -- When they last changed any of the three themselves. Null means they
  -- have never touched them, so the values above are our defaults rather
  -- than their choice, which is a distinction worth being able to make
  -- when somebody asks why they got something.
  add column if not exists prefs_updated_at timestamptz;

-- Every send reads "mailable, and on this list", so the status is part
-- of each index rather than a separate one.
create index if not exists newsletter_subscribers_events_weekly_idx
  on newsletter_subscribers (status) where sub_events_weekly;
create index if not exists newsletter_subscribers_drops_monthly_idx
  on newsletter_subscribers (status) where sub_drops_monthly;
create index if not exists newsletter_subscribers_newsletter_monthly_idx
  on newsletter_subscribers (status) where sub_newsletter_monthly;
