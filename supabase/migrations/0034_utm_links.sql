-- UTM LINKS: the shared library of tagged links WHOA sends out.
--
-- 0032 started recording utm_* on every landing, but a tag is only as
-- good as the person typing it: "Instagram", "insta" and "ig" are three
-- rows on a dashboard. This is the one list everyone copies from, built
-- by the portal's link builder so the tags are always spelled the way
-- lib/channels.ts files them.
--
-- The link itself is not stored. It is rebuilt from the path and tags
-- against whatever domain the portal is served on, so a domain change
-- never leaves a library of dead URLs behind.

create table if not exists utm_links (
  id uuid primary key default gen_random_uuid(),
  -- A human name for the link: "Fall drop — IG story #2".
  label text,
  -- Site path the link lands on, always with a leading slash.
  path text not null default '/',
  -- The tags, lowercased and slugged by the builder before they get here.
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  -- Optional: which post or button. Read by Google Analytics, and by the
  -- portal once 0035 adds it to page_views.
  utm_content text,
  -- Account code of whoever made it. Not a foreign key, same reasoning as
  -- rolodex_contacts.created_by: accounts get deactivated.
  created_by text,
  created_at timestamptz not null default now(),
  -- The same link saved twice is one link. NULLS NOT DISTINCT (Postgres
  -- 15+) so two links with no content still count as the same one.
  constraint utm_links_unique unique nulls not distinct
    (path, utm_source, utm_medium, utm_campaign, utm_content)
);

create index if not exists utm_links_created_idx on utm_links(created_at desc);
create index if not exists utm_links_campaign_idx on utm_links(utm_campaign);

-- Matching stats to links means finding a session's entry view by its
-- tags; this keeps that off a full scan once page_views is large.
create index if not exists page_views_utm_idx
  on page_views(utm_source, utm_medium, utm_campaign)
  where is_entry and utm_source is not null;

alter table utm_links enable row level security;
