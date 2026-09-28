-- CUSTOMER ADMIN: the customer directory tab.
--
-- One column, nothing else. The directory itself is assembled at read
-- time from Square's customer directory and the accounts already in this
-- table — it stores nothing of its own, so there is nothing here to
-- migrate, backfill or keep in sync.
--
-- Off by default, like every other admin permission: the tab shows every
-- customer's email, phone and address, so it is granted one account at a
-- time rather than inherited by anyone who happens to have another tab.

alter table ambassadors
  add column if not exists perm_customer_admin boolean not null default false;
