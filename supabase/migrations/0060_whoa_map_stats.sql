-- WHO HAS PUT THE MOST ON THE MAP, AND HOW MUCH IS ON IT.
--
-- Counted in the database rather than in the page, for one reason
-- that matters: the map itself reads at most 500 pins, because that
-- is as many as a browser can draw without complaining. Counting the
-- rows in that array gives the right answer today and quietly stops
-- being true at pin 501, with nothing anywhere saying so. A function
-- counts all of them and keeps counting.
--
-- EVERYTHING HERE MATCHES WHAT THE MAP SHOWS: approved, and placed.
-- An approved pin with no coordinates is real and somebody sent it,
-- but it is not on the map, and a page whose headline says twelve
-- over a map with ten pins on it is a page nobody trusts. The ones
-- without coordinates are a backlog for the review screen to place,
-- not a number for the public to puzzle over.

-- How much is on the map.
--
-- Cities are deduplicated, which is the whole point of counting them
-- separately from pins: five stickers in Lisbon is five pins and one
-- city. Case and spacing are normalised because these are typed by
-- hand, and "San Diego", "san diego" and " San Diego " are one place
-- however they arrive. Region and country are in the key as well, so
-- the two Portlands stay two cities.
create or replace function whoa_map_totals()
returns table (pins integer, cities integer)
language sql
stable
as $$
  select
    count(*)::integer,
    count(distinct (
      lower(btrim(city)) || '|' ||
      lower(btrim(coalesce(region, ''))) || '|' ||
      lower(btrim(country))
    ))::integer
  from whoa_map_pins
  where status = 'approved'
    and latitude is not null;
$$;

-- The leaderboard.
--
-- Grouped on a normalised name, so somebody who signs "@jane" once,
-- "Jane" the next time and "  @Jane  " on a phone keyboard is one
-- person rather than three thirds of one. The name shown back is their own most recent spelling of it,
-- not the normalised key, because the key is lower case and nobody
-- wants to see themselves in lower case.
--
-- Ties go to whoever got there first: same count, earlier first pin,
-- higher up. Without that the order of equals is whatever Postgres
-- felt like and the board reshuffles between page builds for no
-- reason anybody could explain.
create or replace function whoa_map_top_taggers(p_limit integer default 10)
returns table (name text, pins integer, first_at timestamptz)
language sql
stable
as $$
  select
    btrim((array_agg(uploaded_by order by submitted_at desc))[1]) as name,
    count(*)::integer as pins,
    min(submitted_at) as first_at
  from whoa_map_pins
  where status = 'approved'
    and latitude is not null
    and btrim(uploaded_by) <> ''
  -- btrim FIRST, then strip the @, then trim again.
  --
  -- ltrim with a character set only removes leading characters that
  -- are in that set, so "  @Jane  " starts with a space, keeps its
  -- @, and became a different person from "@jane". Which it did:
  -- Jane came out as two rows, four pins and one. Trimming before
  -- stripping is the whole fix, and the second trim catches "@ jane".
  group by lower(btrim(ltrim(btrim(uploaded_by), '@ ')))
  order by count(*) desc, min(submitted_at) asc
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$$;

-- The leaderboard and the totals both filter on exactly this, and it
-- is the same filter the map itself uses, so one index serves all
-- three.
create index if not exists whoa_map_pins_placed_idx
  on whoa_map_pins (status)
  where latitude is not null;
