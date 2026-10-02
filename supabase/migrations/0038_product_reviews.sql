-- PRODUCT REVIEWS: what customers actually said, and the queue for it.
--
-- Google lists aggregateRating and review as recommended fields on a
-- Product, and Search Console warns about every page missing them. The
-- only honest way to clear that warning is to have real reviews, so this
-- is the table they live in. Nothing here is ever generated, imported or
-- averaged from somewhere else: every row is something a person typed.
--
-- Google's review snippet guidelines were tightened on 24 July 2026 to
-- prohibit fake reviews and undisclosed incentivised ones, with manual
-- actions as the penalty. The design follows from that: nothing is
-- published without a human approving it, and the markup on the page can
-- only ever contain rows that are approved and visible.

alter table ambassadors
  add column if not exists perm_reviews boolean not null default false;

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),

  -- Square's catalog item id. The stable one: a slug follows the product
  -- name and the name gets edited, which would orphan the reviews.
  product_id text not null,
  -- Both kept as they were at the time of writing, so a review can still
  -- be identified and linked after the product is renamed or deleted
  -- from Square. Denormalised on purpose: this is a record of what was
  -- said about what, not a join.
  product_slug text,
  product_name text not null,

  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null,

  -- Shown. A display name, whatever they typed.
  author_name text not null,
  -- Never shown, to anyone but a moderator. It is here to check the
  -- purchase against Square, to stop one person filing fifty reviews,
  -- and so there is a way to reply.
  author_email text not null,
  -- Set when the reviewer was signed in. Null for most, since buying
  -- does not require an account.
  account_code text,

  -- Matched against Square's order history at submission time. A badge,
  -- not a gate: it is false whenever we could not prove it either way,
  -- including when Square was simply unreachable.
  verified_purchase boolean not null default false,

  -- pending | approved | rejected. Nothing reaches the page or the
  -- structured data until a person moves it to approved.
  status text not null default 'pending',
  moderated_by text,
  moderated_at timestamptz,

  -- WHOA's public answer, shown under the review.
  reply_body text,
  reply_at timestamptz,

  -- Salted hash, never the address itself: enough to rate-limit a flood
  -- from one source without keeping a log of who read what.
  ip_hash text,

  created_at timestamptz not null default now(),

  constraint product_reviews_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

-- The product page's own query: this product, approved, newest first.
create index if not exists product_reviews_product_idx
  on product_reviews (product_id, status, created_at desc);

-- The moderation queue, which reads pending across every product.
create index if not exists product_reviews_status_idx
  on product_reviews (status, created_at desc);

-- One review per person per product. Not a rule about opinions: without
-- it, the average is whatever one determined person has the patience to
-- type, which is exactly the manipulation the markup is supposed not to
-- carry.
create unique index if not exists product_reviews_one_per_person_idx
  on product_reviews (product_id, lower(author_email));

-- Rate limiting counts recent rows by hash and by address.
create index if not exists product_reviews_recent_idx
  on product_reviews (created_at desc);
