-- MUSIC ADMIN: a reviewable state for Music Collective applications.
--
-- Until now an application was a musician_profiles row and nothing else.
-- "Pending" was inferred from ambassadors.perm_music being false, which
-- works exactly once: the moment staff declines somebody, the row looks
-- identical to a brand-new application and comes back to the top of the
-- queue forever. There was also no queue to come back to, because the
-- only way to approve anyone was the one-click link in the notification
-- email, and a lost email meant a lost applicant.
--
-- So the decision gets written down.
--
--   status is the queue. 'pending' is waiting on staff, 'approved' has
--   access, 'declined' has been answered. perm_music stays the thing
--   that actually opens the MUSIC tab, because every gate in the app
--   already reads it; status records what was decided and when, so the
--   queue can empty.
--
--   reviewed_by is an account code, not a foreign key, for the same
--   reason the blog's author_code is not one: the decision outlives the
--   reviewer's account.

alter table musician_profiles
  add column if not exists status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  -- Shown to staff only. The applicant gets the decision by email; this
  -- is the "already signed to a label" note for whoever reads the queue
  -- next.
  add column if not exists review_note text;

alter table musician_profiles
  drop constraint if exists musician_profiles_status_check;

alter table musician_profiles
  add constraint musician_profiles_status_check
  check (status in ('pending', 'approved', 'declined'));

-- Existing rows predate the column, so their decision has to be read
-- back off the permission that was granted at the time. Anyone holding
-- perm_music was approved by definition; everybody else is genuinely
-- still waiting, which is the correct place for them to land.
update musician_profiles p
   set status = 'approved',
       reviewed_at = coalesce(p.reviewed_at, p.updated_at)
  from ambassadors a
 where a.code = p.ambassador_code
   and a.perm_music is true
   and p.status = 'pending';

-- The queue's own query: pending first, oldest first.
create index if not exists musician_profiles_status_idx
  on musician_profiles (status, created_at);

-- Who may open the MUSIC ADMIN tab. Same shape as every other
-- permission column, and optional in the application's select for the
-- same reason: until this migration runs the gate reads false and costs
-- one tab rather than every account lookup.
--
-- Separate from perm_music on purpose. perm_music is the artist's own
-- tab; this one reviews other artists, and an artist does not get to
-- approve themselves by holding the first.
alter table ambassadors
  add column if not exists perm_music_admin boolean not null default false;
