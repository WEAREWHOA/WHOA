-- Unified accounts: every signup (customer, ambassador, artist/vendor,
-- musician, SSBD crew) is one row in `ambassadors` — the table name is now
-- legacy, but renaming it is a bigger, riskier migration than the value it
-- buys, so it stays as the underlying account table. What differs per
-- account is which dashboard tabs are unlocked, via these permission
-- flags — off by default for a plain email+password signup, granted by a
-- Super Admin (or automatically by the /apply ambassador flow).

alter table ambassadors add column if not exists perm_ambassador boolean not null default false;
alter table ambassadors add column if not exists perm_vendor boolean not null default false;
alter table ambassadors add column if not exists perm_music boolean not null default false;
alter table ambassadors add column if not exists perm_ssbd boolean not null default false;
alter table ambassadors add column if not exists is_super_admin boolean not null default false;

-- Backfill: every account that exists as of this migration was created
-- through the old ambassador-only signup/apply flow, so it already is one.
update ambassadors set perm_ambassador = true;
