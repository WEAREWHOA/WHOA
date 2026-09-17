-- Tickets can now be bought in batches: one QR code that admits several
-- people, rather than forcing a group to check out one at a time.
--
-- price_cents stays the price of a SINGLE ticket, which is what it has
-- always meant. What was paid is price_cents * quantity — see
-- lib/eventsAdmin.ts, which sums it that way for revenue and headcount.
--
-- Existing rows are all single tickets, which the default covers, so this
-- is safe to run against live data.

alter table event_rsvps
  add column if not exists quantity integer not null default 1;

-- A sanity floor only. The real cap (5) is a product rule that lives in
-- lib/events.ts, where changing it doesn't need a migration.
alter table event_rsvps
  drop constraint if exists event_rsvps_quantity_positive;
alter table event_rsvps
  add constraint event_rsvps_quantity_positive check (quantity >= 1);
