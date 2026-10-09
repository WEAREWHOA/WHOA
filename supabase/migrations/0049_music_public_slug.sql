-- A public URL for an approved Music Collective artist.
--
-- Approving somebody now puts them on /music-collective and gives them
-- their own page there, which means they need a URL -- and a URL is a
-- promise. Deriving it from the artist name on every read would move the
-- page the first time somebody tweaked their own stage name in their
-- portal, throwing away every link, share and bit of search ranking the
-- page had earned. Exactly the hazard the blog's slug comment describes,
-- except nobody would be there to be warned.
--
-- So it is written down once, when the application is approved, and left
-- alone afterwards. A later rename changes the heading on the page and
-- not the address of it.
alter table musician_profiles
  add column if not exists slug text;

-- Unique where set, and silent about the nulls: an application that has
-- not been approved yet has no public page and so has no slug, and there
-- will be plenty of those.
create unique index if not exists musician_profiles_slug_key
  on musician_profiles (slug)
  where slug is not null;

-- Artists approved before this column existed get a slug the first time
-- they are looked at, from the same helper that names a new one (see
-- ensureMusicianSlug in lib/musicianProfiles.ts). Nothing is backfilled
-- here, because the uniqueness rule has to be enforced against the
-- hand-written roster in lib/musicians.ts too, and that list is not in
-- this database.
