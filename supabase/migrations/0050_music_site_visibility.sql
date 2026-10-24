-- Show or hide one approved artist on the public Music Collective page.
--
-- Approval and publication were the same decision, and they are not the
-- same thing. Approving somebody unlocks their MUSIC tab so they can
-- write their profile, submit work and be paid; putting them on the
-- public page is a separate call about what the roster should look like
-- on a given day -- a launch to hold them for, a profile that is not
-- finished, an artist who asked to come down for a while.
--
-- Default false, so nothing changes for anybody already approved: the
-- roster after this migration is exactly the roster before it. Hiding
-- is the deliberate act, which is the right way round for a column that
-- can make somebody disappear from the site.
--
-- Not a replacement for the launch date in lib/musicRoster.ts. That one
-- is a line across everybody at once and flips by itself; this is one
-- artist at a time, by hand. An artist is public only when both agree.
alter table musician_profiles
  add column if not exists site_hidden boolean not null default false;

-- Who last changed it and when. Not a foreign key, for the same reason
-- reviewed_by is not one: the decision outlives the account that made
-- it, and "who took them down" is the first question anybody asks.
alter table musician_profiles
  add column if not exists site_hidden_at timestamptz,
  add column if not exists site_hidden_by text;
