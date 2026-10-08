Blog images committed to the repo.

Anything dropped in this folder is served from the site root, so

    public/blog-images/bleach-jacket.jpg

is reachable at

    https://www.wearewhoa.art/blog-images/bleach-jacket.jpg

and that full URL is what goes in a post's cover field, or in an
![alt](url) in the body.

Named blog-images rather than blog on purpose. Static files win over
routes, so public/blog/thing.jpg would answer before /blog/[slug] ever
ran. That works right up until a post is given a slug matching a file
in here, at which point the image silently shadows the post. A separate
namespace cannot collide.

Prefer the portal for anything posted regularly: PORTAL -> BLOG
uploads to Supabase and hands back a URL with no commit and no deploy.
This folder is for the few images that belong to the codebase rather
than to any one post: a default cover, a mark used inside an article.

Every image here is in the git history forever, so keep them small and
keep them few.
