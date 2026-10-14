import type { Metadata } from "next";
import Link from "next/link";
import { describe, listPublishedPosts, readingMinutes } from "@/lib/blog";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  alternates: { canonical: "/blog" },
  title: "Blog",
  description:
    "Hand-painted apparel, one-of-one pieces, the artists behind them and what happens at a WHOA pop-up. Written from the shop in Ocean Beach.",
  // No openGraph block: it replaced the inherited one and took the
  // image with it. The title and description above fill og and twitter,
  // and opengraph-image.tsx beside this file supplies the card.
};

// Posts can be scheduled, so a page frozen at build time would sit on a
// post whose publish time had passed. An hour is close enough for
// something written days ahead, and keeps this off the database on every
// request.
export const revalidate = 3600;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The index, as a Blog with its posts listed.
 *
 * ItemList rather than a bare set of BlogPosting objects: the posts
 * themselves carry their full markup on their own pages, and repeating
 * it here would have two pages claiming to be the same article.
 */
function buildJsonLd(posts: { slug: string; title: string; publishedAt: string | null }[]): string {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The WHOA Blog",
    url: `${SITE_URL}/blog`,
    publisher: { "@type": "Organization", name: "WHOA", url: SITE_URL },
    blogPost: posts.slice(0, 20).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `${SITE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
    })),
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  return (
    <section className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      {posts.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd(posts) }} />
      )}

      <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
        From the shop
      </span>
      <h1 className="font-display mt-2 text-4xl tracking-wide sm:text-5xl">
        The WHOA <span className="text-flame">Blog</span>
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        How the pieces get made, the artists making them, and what actually happens at a pop-up.
        Written from the WHOADEGA on Newport Ave.
      </p>

      {posts.length === 0 ? (
        <p className="card-surface mt-10 rounded-2xl p-6 text-sm text-muted">
          Nothing published yet. The first post is on its way.
        </p>
      ) : (
        <div className="mt-10 grid auto-rows-fr gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="card-surface group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-colors hover:border-flame-2/50"
            >
              {post.coverImageUrl && (
                // Plain <img>: the cover is an arbitrary external URL
                // typed into the editor, and next/image would need every
                // possible host allow-listed in next.config to render it.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.coverImageUrl}
                  alt={post.coverAlt ?? ""}
                  loading="lazy"
                  className="h-44 w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-6">
                {post.tags.length > 0 && (
                  <span className="text-flame text-xs font-semibold tracking-[0.15em] uppercase">
                    {post.tags[0]}
                  </span>
                )}
                <h2 className="font-display mt-1 text-2xl leading-tight">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{describe(post)}</p>
                <span className="mt-auto pt-4 text-xs text-muted">
                  {post.publishedAt && (
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  )}
                  {" · "}
                  {readingMinutes(post.body)} min read
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
