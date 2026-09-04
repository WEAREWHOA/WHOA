-- Optional "which artist are you here for" answer captured on the RSVP/
-- ticket form (not required — a guest can leave it blank). Feeds the
-- per-artist popularity breakdown on the EVENTS ADMIN tab.
alter table event_rsvps add column if not exists selected_artist text;
