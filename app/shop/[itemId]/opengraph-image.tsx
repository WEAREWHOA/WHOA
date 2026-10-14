import { resolveProduct } from "@/lib/catalog";
import { formatCents } from "@/lib/money";
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "A WHOA product";

/**
 * The share card for one product.
 *
 * This is the whole point of the exercise: a link to a hoodie used to
 * preview as the same orange slab as a link to the returns policy, which
 * is a wasted impression every time somebody shares something they want.
 *
 * Square's photos are square and a share card is 1.91:1, so the photo
 * sits beside the text rather than behind it -- a centre crop of a
 * square product shot cuts the garment in half.
 *
 * Priced from the cheapest variation, because a size run's prices are
 * usually identical and, when they are not, the low one is the honest
 * number to put on a card that is standing in for the page.
 */
export default async function ProductOpengraphImage(props: PageProps<"/shop/[itemId]">) {
  const { itemId } = await props.params;

  // Never throws. A card is a decoration on a link that already works,
  // and a 500 here would hand the scraper nothing at all rather than the
  // branded fallback.
  const resolved = await resolveProduct(itemId).catch(() => undefined);
  if (!resolved) {
    return ogCard({ eyebrow: "Shop", title: "WHOA", subtitle: "Hand-painted, one of one." });
  }

  const { product } = resolved;
  const prices = product.variations.map((variation) => variation.priceCents).filter((cents) => cents > 0);
  const lowest = prices.length > 0 ? Math.min(...prices) : null;

  return ogCard({
    eyebrow: product.categories[0]?.name || "Shop",
    title: product.name,
    subtitle: lowest === null ? undefined : formatCents(lowest),
    photo: product.imageUrl,
  });
}
