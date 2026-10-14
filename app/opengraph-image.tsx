import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "WHOA — hand-painted, one-of-a-kind apparel from Ocean Beach, San Diego";

/**
 * The card every page falls back to.
 *
 * It is a fallback now rather than the only card there is: product
 * pages, posts and artist pages each render their own, and this covers
 * the rest. Inherited by every route that doesn't have its own
 * opengraph-image file, which is how the policy pages and the games get
 * something branded without a file apiece.
 */
export default function OpengraphImage() {
  return ogCard({
    eyebrow: "Ocean Beach, San Diego",
    title: "WHOA",
    subtitle: "Hand-painted, one-of-a-kind apparel. Pop-ups, art and music.",
  });
}
