import { notFound, permanentRedirect } from "next/navigation";
import { legacyProductDestination } from "@/lib/legacyProduct";

/** The one-segment form of the same old URL: /product/<slug>. */
export default async function LegacyProductSlugPage(props: PageProps<"/product/[slug]">) {
  const { slug } = await props.params;
  // No id to trust here, so the name in the URL is all there is.
  const destination = await legacyProductDestination(slug, slug);
  if (!destination) notFound();
  permanentRedirect(destination);
}
