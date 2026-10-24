-- One self-chosen promo code per ambassador, alongside the one we derive
-- from their name at signup.
--
-- A promo code and a tracking link are already the same row: the checkout
-- resolves a typed code with getLinkBySlug and attributes the order to
-- that row's ambassador_code, which is why a self-chosen code earns the
-- same discount and the same commission with no further wiring. What this
-- column adds is the ability to tell the one code they picked themselves
-- apart from the per-channel links they can already make, so the portal
-- can show it as a promo code and hold them to one.
alter table links
  add column if not exists is_custom_code boolean not null default false;

-- The real guarantee that "one more" means one. The action checks first,
-- but two submits landing together would both pass that check; only the
-- index can refuse the second write. createCustomPromoCode catches the
-- resulting 23505 and reports it as "you already have one".
create unique index if not exists links_one_custom_code_per_ambassador
  on links (ambassador_code)
  where is_custom_code;
