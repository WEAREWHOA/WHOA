-- THE NAME EVERYONE ELSE KNOWS IT BY.
--
-- Our key for a variation is Square's id, which is right for us and
-- meaningless to anybody else. Every other shop, every bulk upload
-- template and every connector matches on the seller's own SKU, and we
-- were not keeping it, so the only way to pair a line of our inventory
-- with a line of theirs was by reading the product name and guessing.
--
-- Square has held one all along. This mirrors it, so the join key
-- exists before it is needed and is already populated by the time
-- somebody has a listing to map.
--
-- Nullable on purpose. Plenty of variations have no SKU set in Square,
-- and inventing one here would put a number in the field that matches
-- nothing on the other end: worse than an empty cell somebody can see
-- and fill in.
alter table square_product_variations
  add column if not exists sku text;

create index if not exists square_product_variations_sku_idx
  on square_product_variations (sku)
  where sku is not null;
