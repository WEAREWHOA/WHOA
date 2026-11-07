-- WHERE EXACTLY.
--
-- A pin was placed by geocoding the city and country somebody typed,
-- which drops it in the middle of Lisbon. But the thing in the
-- photograph is on one particular lamppost, and "somewhere in Lisbon"
-- is not what makes a map of stickers worth looking at.
--
-- So a submission can now carry its own coordinates, dropped on a map
-- or taken from the phone that is standing next to the sticker. The
-- columns for them already exist from 0056; what was missing is any way
-- for them to arrive filled in, and any record of where they came from.

-- How this pin got its position.
--
--   pin       somebody dropped it on the map themselves
--   device    taken from the submitter's own location
--   geocode   worked out from the city and country they typed
--
-- Worth keeping rather than inferring, because the three are not
-- equally trustworthy and the screen that reviews them should say so.
-- A geocoded pin in the right city is fine; a dropped one claiming to
-- be on a specific corner is a claim somebody made.
alter table whoa_map_pins
  add column if not exists located_by text
    check (located_by in ('pin', 'device', 'geocode'));

-- A submission that arrives with coordinates keeps them through
-- approval rather than being geocoded over the top, so this index is
-- what the approval screen reads to know which it is looking at.
create index if not exists whoa_map_pins_located_idx
  on whoa_map_pins (located_by)
  where located_by is not null;
