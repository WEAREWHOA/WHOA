-- Per-size stock on a submitted product.
--
-- `size` was a single free-text box, so a t-shirt in five sizes had to be
-- submitted five times — five rows, five approvals, five Square items — and
-- nothing anywhere recorded how many of each there actually were. Square's
-- own model already handles this properly: one item, a variation per size,
-- an inventory count per variation. This is the column that lets the
-- submission form say the same thing.
--
-- Shape is {"S": 3, "M": 5, "L": 2} — only sizes the artist actually has,
-- so an empty or absent object means "no size breakdown", and the existing
-- free-text `size` still describes a one-size item. Both are kept: an
-- artist selling a single painting shouldn't be made to think in S/M/L.

alter table art_products
  add column if not exists size_stock jsonb not null default '{}'::jsonb;

comment on column art_products.size_stock is
  'Quantity per size, e.g. {"S":3,"M":5}. Empty means the product has no size breakdown and the free-text size column describes it instead.';
