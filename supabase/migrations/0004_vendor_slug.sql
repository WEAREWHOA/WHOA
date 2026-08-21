-- Links an ambassador account to a vendor/artist (matches a slug in
-- lib/artists.ts), so that account's dashboard Vendor tab can show real
-- sales/inventory scoped to just their own products. Nullable — most
-- ambassador accounts aren't vendors. Set directly in the Supabase table
-- editor for now (no self-serve claim flow yet), or via the "Link
-- ambassador to vendor" tool on /admin/square-sync.

alter table ambassadors add column if not exists vendor_slug text;
