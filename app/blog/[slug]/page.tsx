import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { describe, getPostBySlug, isPublished, listPublishedPosts, readingMinutes } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { SITE_URL } from "@/lib/siteUrl";

export const revalidate = 3600;

/**
 * Drafts and anything scheduled for later are a 404, not a redirect and
 * not an empty page. A crawler that is handed a 200 for a post that does
 * not exist yet will index the empty version, and getting that back out
 * of an index is much harder than keeping it out.
 */
async function published(slug: string) {
  const post = await getPostBySlug(slug);
  return post && isPublished(post) ? post : null;
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await published(slug);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };

  const description = describe(post);
  const url = `${SITE_URL}/blog/${post.slug}`;

  return {
    alternates: { canonical: `/blog/${post.slug}` },
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: post.authorName ? [post.authorName] : undefined,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverAlt ?? post.title }] : undefined,
    },
    twitter: {
      card: post.coverImageUrl ? "summary_large_image" : "summary",
      title: post.title,
      description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildJsonLd(post: {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  authorName: string | null;
  publishedAt: string | null;
  updatedAt: string;
}): string {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title.slice(0, 110),
        description: describe(post),
        url,
        // What Google treats as the canonical identity of the article.
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        author: { "@type": post.authorName ? "Person" : "Organization", name: post.authorName ?? "WHOA" },
        publisher: { "@type": "Organization", name: "WHOA", url: SITE_URL },
        ...(post.coverImageUrl ? { image: [post.coverImageUrl] } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
  return JSON.stringify(jsonLd).replace(/</g, "\\u003c");
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = await published(slug);
  if (!post) notFound();

  // Rendered here, never stored rendered. See lib/markdown.ts for why
  // the escaping happens before any tag is produced.
  const html = renderMarkdown(post.body);

  const others = (await listPublishedPosts(4)).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: buildJsonLd(post) }} />

      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">{post.title}</li>
        </ol>
      </nav>

      {post.tags.length > 0 && (
        <span className="text-flame mt-8 block text-xs font-semibold tracking-[0.2em] uppercase">
          {post.tags.join(" · ")}
        </span>
      )}
      <h1 className="font-display mt-2 text-4xl leading-tight tracking-wide sm:text-5xl">
        {post.title}
      </h1>

      <p className="mt-4 text-sm text-muted">
        {post.authorName && <>By {post.authorName} · </>}
        {post.publishedAt && <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>}
        {" · "}
        {readingMinutes(post.body)} min read
      </p>

      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.coverImageUrl}
          alt={post.coverAlt ?? ""}
          className="mt-8 w-full rounded-2xl border border-border object-cover"
        />
      )}

      <div
        className="blog-body mt-10"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {others.length > 0 && (
        <aside className="mt-16 border-t border-border pt-10">
          <h2 className="font-display text-2xl tracking-wide">Keep reading</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {others.map((other) => (
              <li key={other.id}>
                <Link href={`/blog/${other.slug}`} className="text-flame hover:underline">
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
