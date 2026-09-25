-- Where a visit came from, so a journey can start outside the site.
--
-- page_views already recorded what happened once someone arrived. It
-- could not say how they got here: the beacon reads the path from the
-- router, which carries no query string, so every utm_source we have ever
-- been sent was discarded before it reached the server. Instagram, TikTok
-- and a printed QR all looked identical — "no referrer".
--
-- RETENTION: nothing in this schema expires. There is no TTL, no cron, no
-- cleanup job anywhere in this codebase, and page_views is never deleted
-- from — by design, so year-over-year comparisons stay possible. If rows
-- are ever to be aged out it must be a deliberate, separate migration.

alter table page_views
  -- The campaign tags, exactly as they arrived. Kept raw as well as
  -- classified: a channel is our interpretation and can be re-derived,
  -- but the original tag can't be recovered once it's thrown away.
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  -- Our own classification: instagram, tiktok, google, direct, qr, email,
  -- referral... Derived at write time from the referrer and the tags, and
  -- stored rather than computed on read so a later change to the rules
  -- can't silently rewrite last month's numbers.
  add column if not exists channel text,
  -- True on the first view of a session. First-touch attribution: the
  -- whole visit belongs to however it began, not to whatever page the
  -- person happened to be on when they converted.
  add column if not exists is_entry boolean not null default false;

create index if not exists page_views_channel_idx on page_views(channel);
create index if not exists page_views_entry_idx on page_views(is_entry, created_at desc);
