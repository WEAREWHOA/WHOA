-- ROLODEX: the contact book for everyone WHOA does business with.
--
-- Deliberately standalone. It shares no keys with ambassadors, artists or
-- Square customers, because the people in here mostly aren't any of those
-- — a boutique buyer, a festival booker, a blanks supplier — and forcing
-- them through the accounts table would mean inventing logins for people
-- who will never see this site.
create table if not exists rolodex_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- The business, where the person and the business aren't the same thing.
  company text,
  phone text,
  email text,
  website text,
  -- Instagram is how half of this industry actually gets reached, so it's
  -- its own column rather than a line buried in notes.
  instagram text,
  city text,
  -- Free text, not an enum: the seeded categories (RETAILER, EVENT,
  -- SALES...) cover today, and staff can type a new one the moment a kind
  -- of relationship exists that nobody anticipated. The UI offers whatever
  -- is already in use, so a typo'd category is visibly a typo rather than
  -- silently a new group.
  category text not null default 'OTHER',
  -- What the relationship actually is: "stocks the hoodie line",
  -- "books us for Whoa Wednesday", "prints our blanks".
  partnership text,
  -- Where the relationship stands, so a list of 200 names can be filtered
  -- down to the ones that need chasing.
  status text not null default 'LEAD',
  last_contacted_at date,
  notes text,
  -- Ambassador code of whoever added it. Not a foreign key, for the same
  -- reason as event_rsvps.checked_in_by: staff accounts get deactivated,
  -- and losing who added a contact two years ago would be worse than an
  -- occasional dangling code.
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The three ways this table is read: browsing a category, filtering by
-- status, and newest-first on an unfiltered list.
create index if not exists rolodex_contacts_category_idx on rolodex_contacts(category);
create index if not exists rolodex_contacts_status_idx on rolodex_contacts(status);
create index if not exists rolodex_contacts_created_idx on rolodex_contacts(created_at desc);

alter table rolodex_contacts enable row level security;

-- ROLODEX tab. Like every other permission here it's granted by a Super
-- Admin, and Super Admins have it implicitly — this is a contact book with
-- people's personal phone numbers in it, so it stays off by default for
-- everyone else.
alter table ambassadors
  add column if not exists perm_rolodex boolean not null default false;
