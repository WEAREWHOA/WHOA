-- First-party traffic, and the permission that opens the ANALYTICS tab.
--
-- Every page view the site serves lands here rather than at Google. It is
-- the one thing the rest of the database can't answer: orders, stamps and
-- RSVPs only ever describe people who finished something, so without this
-- table there is no denominator — no way to ask how many people saw a
-- page and left.
--
-- Deliberately thin. No cookie, no cross-site id, no fingerprint: a
-- session_id generated in the browser's sessionStorage, which dies with
-- the tab and can't follow anyone anywhere. That's enough to count
-- sessions and order pages within a visit, and nothing more.

alter table ambassadors
  add column if not exists perm_analytics boolean not null default false;

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  -- The route, never the query string: search terms and ?s= tokens are
  -- not traffic data and shouldn't be retained as if they were.
  path text not null,
  -- Per-tab, from sessionStorage. Not an identity.
  session_id text not null,
  -- Set only when the viewer is signed in, which is what makes a journey
  -- across orders, stamps and prizes possible.
  account_code text,
  -- Host only ("instagram.com"), not the full referring URL.
  referrer_host text,
  device text not null default 'unknown',
  -- Two-letter code from the CDN edge, when it gives us one.
  country text,
  created_at timestamptz not null default now()
);

-- Every analytics query is "recent rows, grouped by something", so the
-- time index carries the weight and the rest narrow from there.
create index if not exists page_views_created_idx on page_views(created_at desc);
create index if not exists page_views_path_idx on page_views(path);
create index if not exists page_views_session_idx on page_views(session_id);
create index if not exists page_views_account_idx on page_views(account_code);

alter table page_views enable row level security;
