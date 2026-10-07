-- THE BLOG.
--
-- The reason this exists is traffic. Every page on this site is either a
-- product that sells once and goes, or a fixed page nobody searches for
-- twice. Neither accumulates. A post about bleach-dyeing a jacket, or a
-- recap of a WHOADEGA night, keeps earning its place in search long
-- after it is written, which is the one kind of page this site has none
-- of.
--
-- So the columns below are mostly about being findable:
--
--   slug is the URL and is immutable in practice. Changing a published
--   post's slug breaks every link to it and throws away whatever it had
--   earned, so the admin screen warns rather than stopping you.
--
--   excerpt is the meta description. Left to a generator it becomes the
--   first 160 characters of the post, which is where the throat-clearing
--   lives. Written by hand, it is the sentence Google shows.
--
--   cover_image_url and cover_alt travel together. An image with no alt
--   is invisible to a crawler and to anybody using a screen reader, and
--   the alt is not optional in the admin form for that reason.
--
--   published_at is both the gate and the date shown. Null means draft:
--   not on the index, not in the sitemap, 404 to the public. Scheduling
--   is a future timestamp, and the same check covers both.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),

  -- Lowercase, hyphenated, unique. Generated from the title on first
  -- save and editable afterwards.
  slug text not null unique,
  title text not null,

  -- The meta description and the card blurb. One field, because two
  -- would drift and nobody would notice which one was wrong.
  excerpt text,

  -- Markdown. Stored as written rather than as rendered HTML so the post
  -- can be re-rendered when the renderer improves, and so a stored post
  -- can never carry a script tag somebody pasted.
  body text not null default '',

  cover_image_url text,
  cover_alt text,

  -- Display name, not an account code: a post outlives the contributor's
  -- account, and a byline that disappears when somebody leaves is worse
  -- than one that is slightly stale.
  author_name text,
  -- Who actually wrote it, for the portal's own filtering. Not a foreign
  -- key, for the same reason the byline is not one.
  author_code text,

  -- Free-form, shown on the post and used to group the index.
  tags text[] not null default '{}',

  -- Null is a draft. A future timestamp is scheduled. Both are hidden
  -- from the public by the same comparison.
  published_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The public index is "published, newest first", which is the one query
-- that has to stay fast as this fills up.
create index if not exists blog_posts_published_idx
  on blog_posts (published_at desc)
  where published_at is not null;

-- Tag filtering on the index.
create index if not exists blog_posts_tags_idx on blog_posts using gin (tags);

-- Row level security, as on every other table here. No policies: the app
-- reaches Supabase only through the service role key, which bypasses
-- RLS. Drafts live in this table alongside published posts, and a draft
-- is exactly the thing an anon key should not be able to read.
alter table blog_posts enable row level security;

-- Who may open the BLOG tab. Same shape as every other permission
-- column, and optional in the application's select for the same reason:
-- until this migration runs, the gate reads false and costs one tab
-- rather than every account lookup.
alter table ambassadors
  add column if not exists perm_blog boolean not null default false;
