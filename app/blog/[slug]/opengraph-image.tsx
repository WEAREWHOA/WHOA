import { getPostBySlug, isPublished } from "@/lib/blog";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A post on the WHOA blog";

function formatDate(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * The share card for one post.
 *
 * Uses the cover image where there is one and falls back to type where
 * there is not, so a post written without a photo still shares as
 * something other than the site's default card.
 *
 * A draft gets the generic card rather than its own: the page itself is
 * a 404 to the public, and a card that previewed an unpublished headline
 * would leak it to anyone who guessed the URL.
 */
export default async function PostOpengraphImage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = await getPostBySlug(slug).catch(() => null);

  if (!post || !isPublished(post)) {
    return ogCard({ eyebrow: "The WHOA Blog", title: "WHOA" });
  }

  return ogCard({
    eyebrow: "The WHOA Blog",
    title: post.title,
    subtitle: formatDate(post.publishedAt),
    photo: post.coverImageUrl,
  });
}
