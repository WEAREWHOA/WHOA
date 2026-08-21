-- Links an account to its Square Customer profile by email, so the
-- Customer tab can show real purchase history instead of placeholder
-- data. Nullable and populated lazily — looked up once by email the
-- first time an account's portal loads and cached here so subsequent
-- loads don't re-search Square's Customers API every time.

alter table ambassadors add column if not exists square_customer_id text;
