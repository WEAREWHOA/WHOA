import type { Metadata } from "next";
import OasisCatalogue from "@/components/oasis/OasisCatalogue";
import { getOasisCatalogue } from "@/lib/oasisCatalogue";

// Its own world: no site nav, no footer (see components/SiteChrome.tsx),
// and its own palette. The only thing shared with the rest of WHOA is who
// you are — a signed-in account prefills the order form.
export const metadata: Metadata = {
  title: "Oasis Catalogue",
  description:
    "A pre-order catalogue of special WHOA pieces — made to order or produced in short runs.",
};

// The catalogue is edited in the database, not in Square, so it doesn't
// need the shop's tighter revalidation.
export const revalidate = 300;

export default async function OasisPage() {
  const { items, usingPlaceholders } = await getOasisCatalogue();
  return <OasisCatalogue items={items} usingPlaceholders={usingPlaceholders} />;
}
