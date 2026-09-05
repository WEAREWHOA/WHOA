-- Backs one-click Approve/Decline buttons in staff notification emails
-- (lib/email.ts, app/api/approve/[token]). One token covers both buttons —
-- the decision comes from which link is clicked (?decision=approve or
-- ?decision=decline), not from the token itself. First click wins:
-- used_at is set on whichever decision is clicked first, so replaying
-- either link afterward is a no-op instead of a second action.
create table if not exists approval_tokens (
  token text primary key,
  kind text not null check (kind in (
    'ambassador_application',
    'event_sales_application',
    'event_sales_signup',
    'music_application',
    'art_application',
    'art_product'
  )),
  -- The ambassador code an approval grants/revokes a permission on
  -- (applications), or null when the target is identified by subject_id
  -- instead (a specific event_sales_signups/art_products row).
  subject_code text,
  subject_id text,
  decision text check (decision in ('approved', 'declined')),
  created_at timestamptz not null default now(),
  used_at timestamptz,
  expires_at timestamptz not null
);
create index if not exists approval_tokens_kind_idx on approval_tokens(kind);

alter table approval_tokens enable row level security;
