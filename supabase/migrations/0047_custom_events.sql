-- EVENTS STAFF CAN CREATE.
--
-- Until now every event was a hand-written entry in lib/events.ts, which
-- means announcing a show is a code change, a review and a deploy. That
-- is the wrong shape for the thing WHOA does most often.
--
-- This table does NOT replace that file. The two are merged at read time
-- and the file wins on a collision, deliberately:
--
--   Those entries are referenced by id from rsvp rows, from the SSBD
--   crew hub, from the scavenger hunt and from the door list. A row here
--   that could shadow one of them would silently rewrite the meaning of
--   data already written against it.
--
--   Several of them carry behaviour the database has no column for, like
--   the damage waiver that keys off the venue. Moving them would mean
--   moving that too, in the same change as introducing the table, which
--   is two risks where one will do.
--
-- So lib/events.ts stays as it is, and anything staff create lands here.
-- The merge is in lib/eventsStore.ts.

create table if not exists custom_events (
  -- A slug, generated from the title and then fixed. It is the id every
  -- rsvp, ticket and QR code is written against, so renaming it would
  -- orphan them. The admin screen refuses one that collides with a
  -- built-in event for the same reason.
  id text primary key,

  title text not null,
  -- What the flyer says, free text: "Sat 11 Oct" or "Fri-Sun". The dates
  -- below are what the calendar and the reminders actually use.
  date_label text not null default '',
  time_label text not null default '',
  venue text not null default '',
  -- Street address, used for the map link on /stores.
  location text not null default '',
  -- whoadega | shows | festivals
  category text not null default 'shows',

  start_date date not null,
  end_date date,

  lineup text[] not null default '{}',
  details text[] not null default '{}',
  tags text[] not null default '{}',

  -- The card treatment when there is no flyer photo.
  accent text not null default '#ff7a00',
  gradient text[] not null default '{}',
  -- A real flyer. Uploaded through the portal's media library, so this is
  -- a full URL rather than a path under public/.
  image_url text,
  -- Set only for an event ticketed somewhere else, which keeps linking
  -- out instead of selling through this app. Never set with a price.
  href text,
  -- The slight tilt on the card. Cosmetic.
  rotate numeric not null default 0,

  price_cents integer,
  early_bird_price_cents integer,

  -- Tickets available. Null is unlimited, which is what a free RSVP at a
  -- room nobody can fill usually wants. A number is enforced at purchase
  -- against the quantity already sold, counted in people rather than
  -- bookings, because one booking can be five tickets on one QR.
  capacity integer,

  -- False keeps it off the public site entirely while it is being built.
  -- It still shows in the admin tab, marked as a draft.
  published boolean not null default false,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint custom_events_category_check
    check (category in ('whoadega', 'shows', 'festivals')),
  -- An externally ticketed event has no price here, and a priced one has
  -- no external link. Enforced rather than documented, because the two
  -- together would put a Buy button and an outbound link on one card and
  -- there is no right answer for which wins.
  constraint custom_events_href_xor_price
    check (href is null or (price_cents is null and early_bird_price_cents is null)),
  constraint custom_events_capacity_positive
    check (capacity is null or capacity > 0)
);

-- The public list is "published, happening now or later, soonest first".
create index if not exists custom_events_published_idx
  on custom_events (start_date)
  where published;

-- Row level security, as on every other table here. No policies: the app
-- reaches Supabase only through the service role key, which bypasses
-- RLS. Unpublished events live in this table alongside live ones, and a
-- draft is exactly what an anon key should not be able to read.
alter table custom_events enable row level security;
