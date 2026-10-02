-- EMAIL/TEXT: the audience behind the marketing tab.
--
-- The mirror table gains the things a marketing platform needs and a
-- plain signup form never had: a phone number, the Square customer this
-- person already is, the tags they carry, and a status that can say more
-- than "on the list or not".
--
-- Why a local status at all, when Resend owns subscription state:
-- Resend knows about the people we put in Resend. It cannot know about
-- the ones we deliberately keep out. A hard-bounced address and someone
-- who never opted in are both "not mailable", for completely different
-- reasons, and both need to be remembered so they are not re-imported
-- next time somebody exports a list. Resend still owns `unsubscribed`
-- for everyone it holds; this column records what we decided before they
-- ever got there.

alter table newsletter_subscribers
  -- As typed. Kept so a number can be checked against Square or read out
  -- loud, even when it will not normalise.
  add column if not exists phone text,
  -- +15551234567 or null. Null means we could not make sense of it, and
  -- nothing that needs a real number will touch the row.
  add column if not exists phone_e164 text,
  add column if not exists square_customer_id text,
  -- Segments, in the only form that survives an export: a list of names.
  add column if not exists tags text[] not null default '{}',
  -- subscribed | unsubscribed | cleaned | never
  --   subscribed    mailable
  --   unsubscribed  asked us to stop
  --   cleaned       hard bounced or marked spam, must never be mailed
  --                 again: sending to these is how a sending domain dies
  --   never         gave us an address for something else (an RSVP, a
  --                 survey) and never asked for marketing
  add column if not exists status text not null default 'subscribed',
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsub_reason text,
  -- True only where there is an actual record of them opting in: a real
  -- opt-in IP and timestamp, not a bulk import. The difference matters
  -- when somebody complains, and it is the one fact a CSV import can
  -- quietly destroy.
  add column if not exists optin_recorded boolean not null default false,
  -- Separate from email consent on purpose. Texting somebody who only
  -- ever gave an email is a TCPA problem, not a marketing decision, so
  -- this is false until there is a record saying otherwise.
  add column if not exists sms_consent boolean not null default false,
  add column if not exists imported_from text,
  add column if not exists updated_at timestamptz;

alter table newsletter_subscribers
  drop constraint if exists newsletter_subscribers_status_check;
alter table newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('subscribed', 'unsubscribed', 'cleaned', 'never'));

-- Tag filtering is the main thing the audience view does, and an array
-- containment query needs GIN to not be a sequential scan.
create index if not exists newsletter_subscribers_tags_idx
  on newsletter_subscribers using gin (tags);

create index if not exists newsletter_subscribers_status_idx
  on newsletter_subscribers (status);

-- Only the numbers that normalised, since those are the only ones that
-- could ever be texted or matched.
create index if not exists newsletter_subscribers_phone_idx
  on newsletter_subscribers (phone_e164)
  where phone_e164 is not null;

-- Row level security, as on every other table here. No policies: this
-- app reaches Supabase only through the service role key, which bypasses
-- RLS, so the app is unaffected and anon keys can read nothing. This
-- table is now every contact's email, phone and address in one place.
alter table newsletter_subscribers enable row level security;
