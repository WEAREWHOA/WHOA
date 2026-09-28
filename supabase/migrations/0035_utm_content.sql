-- The last two campaign tags, so the portal can tell one post from another.
--
-- 0032 kept utm_source, utm_medium and utm_campaign. That's enough to say
-- "Instagram stories for the fall drop", but not which story: the link
-- builder (0034) puts that in utm_content, and until now only Google
-- Analytics ever saw it. utm_term rides along for search ads, which is
-- where Google Ads puts the keyword.
--
-- recordPageView retries without these columns if they're missing, so
-- deploying the code before running this loses the new tags, not the view.

alter table page_views
  add column if not exists utm_content text,
  add column if not exists utm_term text;
