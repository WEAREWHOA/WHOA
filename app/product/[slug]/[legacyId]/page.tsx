import { notFound, permanentRedirect } from "next/navigation";
import { legacyProductDestination } from "@/lib/legacyProduct";

/**
 * Square Online product URLs: /product/<slug>/<catalog-id>.
 *
 * A page rather than a route handler so a product that's genuinely gone
 * can render the real 404 — a route handler can only return a response,
 * and "redirect everything to /shop" is what earned the soft-404 flag in
 * Search Console.
 */
export default async function LegacyProductPage(
  props: PageProps<"/product/[slug]/[legacyId]">,
) {
  const { slug, legacyId } = await props.params;
  const destination = await legacyProductDestination(legacyId, slug);
  if (!destination) notFound();
  permanentRedirect(destination);
}
