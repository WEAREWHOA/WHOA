-- Timestamp proving a guest agreed to the damage-responsibility waiver
-- before completing an RSVP/ticket for a WHOAdega/SH!FT Gallery event
-- (see lib/events.ts's requiresDamageWaiver). Null means either the event
-- didn't require it, or — enforced server-side in eventRsvpAction — the
-- RSVP would have been rejected outright for one that did.
alter table event_rsvps add column if not exists waiver_agreed_at timestamptz;
