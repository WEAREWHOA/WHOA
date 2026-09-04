-- Gates the portal's "EVENTS ADMIN" tab (KPIs + guest lists across every
-- event) — same pattern as perm_vendor/perm_music/perm_ssbd. Super Admins
-- already bypass this check in code; this is for granting the tab to a
-- non-Super-Admin account (e.g. an events manager) without handing them
-- everything Super Admin unlocks.
alter table ambassadors add column if not exists perm_events_admin boolean not null default false;
