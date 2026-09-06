-- Per-account media library.
--
-- Before this, the only uploads on the platform were the Art Collective's,
-- they went to a bucket that had to exist already, and once uploaded a file
-- could never be listed or removed — the URL was written into a profile row
-- and that was the end of it.
--
-- This table is the index that makes a file a thing an account owns:
-- who uploaded it, which tab it belongs to, and where it lives in Storage,
-- so the portal can show someone their own files and let them delete one.
--
-- Storage itself stays a single bucket (`whoa-media`), keyed by account:
--   whoa-media/<ACCOUNT CODE>/<kind>/<uuid>.<ext>
-- Supabase has no per-user buckets — a "folder" is just a filename prefix —
-- so one bucket with the code as the first segment gives every account its
-- own space without a second set of storage rules to keep in sync. The
-- bucket is created by the app on first use (ensureMediaBucket in
-- lib/media.ts) rather than here, because inserting into storage.buckets
-- from a migration is exactly what failed for the art-photos bucket.

create table if not exists account_media (
  id text primary key,
  ambassador_code text not null references ambassadors(code) on update cascade on delete cascade,
  -- Which tab this belongs to. Matches MEDIA_KINDS in lib/media.ts, and
  -- decides both where it's shown and which permission is needed to add
  -- one — an account can only upload for a tab it actually has.
  kind text not null,
  -- Path inside the bucket. Kept alongside the public URL because deleting
  -- needs the path, and a URL is not reliably reversible into one.
  --
  -- Note this is a plain string: if an account's code is later renamed, the
  -- row's ambassador_code follows (ON UPDATE CASCADE) but the path keeps the
  -- old code in it. That's fine — ownership is ambassador_code, and the path
  -- is only ever used to find the bytes again — but don't read a path as a
  -- statement about who owns the file today.
  storage_path text not null unique,
  public_url text not null,
  file_name text,
  content_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists account_media_code_idx on account_media(ambassador_code);
create index if not exists account_media_kind_idx on account_media(ambassador_code, kind);

-- Same posture as every other table here: RLS on with no policies, so only
-- the service_role key this app uses can read or write. Ownership is
-- enforced in the server actions, which check the session's own account
-- code before touching a row.
alter table account_media enable row level security;
