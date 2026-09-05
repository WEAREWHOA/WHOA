-- Payout methods are now just Venmo and Zelle (both identified by the phone
-- number attached to that account), replacing the original PayPal/Venmo/Bank
-- transfer set. Existing rows on a retired method fall back to Venmo — their
-- payout_destination (whatever handle/account they'd entered) stays as-is
-- until they update it from the portal.
update ambassadors set payout_method = 'venmo' where payout_method in ('paypal', 'bank');

-- The seeded demo ambassador's destination was an email address (valid
-- under the old PayPal default) — swap it for a fake phone number so the
-- demo portal matches the new "phone number attached to account" field.
update ambassadors set payout_destination = '619-555-0141'
  where code = 'WHOA-DEMO15' and payout_destination = 'demo@wearewhoa.art';

alter table ambassadors drop constraint if exists ambassadors_payout_method_check;
alter table ambassadors add constraint ambassadors_payout_method_check
  check (payout_method in ('venmo', 'zelle'));
