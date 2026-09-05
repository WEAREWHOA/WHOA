-- Backs the portal's Settings tab "delete account" action — deactivates a
-- backend-portal login (blocks future sign-in) without touching their
-- historical data: orders, links, click stats, and RSVPs all stay intact
-- for accounting/audit purposes. Null means active.
alter table ambassadors add column if not exists deleted_at timestamptz;
