import Link from "next/link";
import { deletePostAction, savePostAction, unpublishPostAction } from "@/app/blog-admin/actions";
import { describe, isPublished, readingMinutes, type BlogPost } from "@/lib/blog";
import { utcToPacificWallTime } from "@/lib/pacificTime";
import { portalPath } from "@/lib/portalNav";

/**
 * The BLOG tab.
 *
 * One editor, opened by ?edit=<id> or ?edit=new, with the list
 * underneath. A form per post rather than a modal, because a post is
 * long enough that losing it to a stray click would be unforgivable and
 * a plain page cannot be dismissed by one.
 */

function statusOf(post: BlogPost): { label: string; tone: string } {
  if (!post.publishedAt) return { label: "Draft", tone: "text-muted" };
  if (!isPublished(post)) return { label: "Scheduled", tone: "text-flame-3" };
  return { label: "Published", tone: "text-flame" };
}

const FIELD =
  "mt-2 w-full rounded-lg border border-border-strong bg-surface-raised px-4 py-3 text-sm outline-none focus:border-flame-2";

function Editor({ post }: { post: BlogPost | null }) {
  return (
    <div className="card-surface rounded-xl p-6">
      <h3 className="font-semibold">{post ? "Edit post" : "New post"}</h3>
      <p className="mt-1 text-sm text-muted">
        The body is Markdown. A single <code>#</code> becomes a sub-heading, not a second H1: the
        title above is the page&apos;s only H1, and two is the most common structural SEO mistake
        there is.
      </p>

      <form action={savePostAction} className="mt-5 flex flex-col gap-5">
        {post && <input type="hidden" name="id" value={post.id} />}

        <div>
          <label htmlFor="blog-title" className="text-sm font-medium">Title</label>
          <input id="blog-title" name="title" defaultValue={post?.title ?? ""} required maxLength={200} className={FIELD} />
        </div>

        <div>
          <label htmlFor="blog-slug" className="text-sm font-medium">
            URL <span className="font-normal text-muted">(leave blank to build it from the title)</span>
          </label>
          <input id="blog-slug" name="slug" defaultValue={post?.slug ?? ""} className={FIELD} placeholder="how-we-bleach-a-jacket" />
          <p className="mt-2 text-xs text-muted">
            /blog/<span className="text-foreground">{post?.slug ?? "your-post"}</span>
            {post && isPublished(post) && (
              <>
                {" "}
                &middot; changing this on a published post breaks every link to it and gives up
                whatever it has earned in search. Only do it if the current one is wrong.
              </>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="blog-excerpt" className="text-sm font-medium">
            Excerpt <span className="font-normal text-muted">(the sentence Google shows)</span>
          </label>
          <textarea id="blog-excerpt" name="excerpt" rows={2} maxLength={300} defaultValue={post?.excerpt ?? ""} className={FIELD} />
          <p className="mt-2 text-xs text-muted">
            Around 150 characters. Left blank we use the opening of the post, which is usually the
            throat-clearing rather than the point.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="blog-cover" className="text-sm font-medium">Cover image URL</label>
            <input id="blog-cover" name="coverImageUrl" defaultValue={post?.coverImageUrl ?? ""} className={FIELD} placeholder="https://..." />
          </div>
          <div>
            <label htmlFor="blog-alt" className="text-sm font-medium">Describe the image</label>
            <input id="blog-alt" name="coverAlt" defaultValue={post?.coverAlt ?? ""} className={FIELD} placeholder="A bleached denim jacket on a rail" />
            <p className="mt-2 text-xs text-muted">Required with an image. It is what a screen reader and a crawler read.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="blog-author" className="text-sm font-medium">Byline</label>
            <input id="blog-author" name="authorName" defaultValue={post?.authorName ?? ""} className={FIELD} />
          </div>
          <div>
            <label htmlFor="blog-tags" className="text-sm font-medium">
              Tags <span className="font-normal text-muted">(comma separated)</span>
            </label>
            <input id="blog-tags" name="tags" defaultValue={post?.tags.join(", ") ?? ""} className={FIELD} placeholder="Process, Ocean Beach" />
          </div>
        </div>

        <div>
          <label htmlFor="blog-body" className="text-sm font-medium">Body</label>
          <textarea id="blog-body" name="body" rows={20} defaultValue={post?.body ?? ""} className={`${FIELD} font-mono text-xs leading-relaxed`} />
          <p className="mt-2 text-xs text-muted">
            **bold**, *italic*, [link](https://...), ![alt](image-url), &gt; quote, - bullets,
            ## headings, --- rule, ```code```.
          </p>
        </div>

        <div>
          <label htmlFor="blog-when" className="text-sm font-medium">
            Publish at <span className="font-normal text-muted">(Pacific, blank means now)</span>
          </label>
          <input id="blog-when" type="datetime-local" name="publishedAt" defaultValue={utcToPacificWallTime(post?.publishedAt ?? null)} className={FIELD} />
          <p className="mt-2 text-xs text-muted">
            A future time schedules it. Nothing has to run for it to appear: it starts counting as
            published the moment that time passes.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="save" className="rounded-full border border-border-strong px-6 py-2.5 text-sm font-semibold tracking-wide uppercase hover:border-flame-2/50">
            Save draft
          </button>
          <button type="submit" name="intent" value="publish" className="btn-flame rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase">
            {post && isPublished(post) ? "Update published post" : "Publish"}
          </button>
          <Link href={portalPath("blog")} className="self-center text-sm text-muted hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function BlogTab({
  posts,
  editing,
  notice,
  error,
}: {
  posts: BlogPost[];
  editing: BlogPost | null | "new";
  notice?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">{error}</p>
      )}
      {notice && (
        <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-3 text-sm text-flame-3">{notice}</p>
      )}

      {editing ? (
        <Editor post={editing === "new" ? null : editing} />
      ) : (
        <div className="card-surface flex flex-wrap items-center justify-between gap-4 rounded-xl p-6">
          <div>
            <h3 className="font-semibold">Blog</h3>
            <p className="mt-1 text-sm text-muted">
              {posts.length === 0
                ? "No posts yet."
                : `${posts.length} post${posts.length === 1 ? "" : "s"}.`}{" "}
              Published posts appear on <Link href="/blog" className="text-flame hover:underline">/blog</Link> and in the sitemap.
            </p>
          </div>
          <Link href={portalPath("blog", "edit=new")} className="btn-flame rounded-full px-6 py-2.5 text-sm font-semibold tracking-wide uppercase">
            Write a post
          </Link>
        </div>
      )}

      {posts.length > 0 && (
        <div className="flex flex-col gap-3">
          {posts.map((post) => {
            const status = statusOf(post);
            return (
              <div key={post.id} className="card-surface rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold tracking-[0.15em] uppercase ${status.tone}`}>
                      {status.label}
                      {post.publishedAt && (
                        <>
                          {" · "}
                          <time dateTime={post.publishedAt}>
                            {new Date(post.publishedAt).toLocaleString("en-US", {
                              timeZone: "America/Los_Angeles",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </time>
                        </>
                      )}
                    </p>
                    <h4 className="font-display mt-1 text-xl">{post.title}</h4>
                    <p className="mt-1 text-sm text-muted">{describe(post)}</p>
                    <p className="mt-2 text-xs text-muted">
                      /blog/{post.slug} · {readingMinutes(post.body)} min read
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isPublished(post) && (
                      <Link href={`/blog/${post.slug}`} className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50">
                        View
                      </Link>
                    )}
                    <Link href={portalPath("blog", `edit=${post.id}`)} className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50">
                      Edit
                    </Link>
                    {post.publishedAt && (
                      <form action={unpublishPostAction}>
                        <input type="hidden" name="id" value={post.id} />
                        <button type="submit" className="rounded-full border border-border-strong px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:border-flame-2/50">
                          Unpublish
                        </button>
                      </form>
                    )}
                    <form action={deletePostAction}>
                      <input type="hidden" name="id" value={post.id} />
                      <button type="submit" className="text-flame-3 rounded-full border border-flame-1/40 px-4 py-2 text-xs font-semibold tracking-wide uppercase hover:bg-flame-1/10">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
