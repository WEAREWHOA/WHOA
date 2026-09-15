-- Door check-in for tickets and RSVPs, and the permission that gates it.
--
-- Until now /checkin/[rsvpId] was read-only: it showed a ticket's details
-- for staff to eyeball, but nothing recorded that anyone actually walked
-- in, so the same QR code worked as many times as it was shown. These two
-- columns are what turn a ticket into something that can be spent.
--
-- checked_in_at doubles as the lock. The check-in query updates only rows
-- where it is still null, so two doors scanning the same code at the same
-- moment can't both succeed — one updates the row, the other matches
-- nothing and is refused. That's why this is a nullable timestamp rather
-- than a boolean plus a separate time: one column, one atomic test.
alter table event_rsvps
  add column if not exists checked_in_at timestamptz,
  -- The ambassador code of whoever scanned it. Not a foreign key: staff
  -- accounts get deactivated and renamed, and losing the audit trail of
  -- who worked a door two years ago because of that would be worse than
  -- an occasional dangling code.
  add column if not exists checked_in_by text;

-- The door list is always "this event, who's still outside" — so the index
-- that matters is per-event, and a partial index on the not-yet-arrived
-- keeps it small as history grows.
create index if not exists event_rsvps_event_checkin_idx
  on event_rsvps(event_id, checked_in_at);

-- RSVP ADMIN: working the door. Deliberately its own permission rather
-- than folding into perm_events_admin — the people scanning wristbands at
-- 11pm are not necessarily the people who should see every guest list,
-- revenue figure and work-signup request for every event ever held.
alter table ambassadors
  add column if not exists perm_rsvp_admin boolean not null default false;

-- Anyone already trusted with the whole events backend keeps the door too,
-- so nobody who could admit guests yesterday is locked out today.
update ambassadors set perm_rsvp_admin = true where perm_events_admin = true;
