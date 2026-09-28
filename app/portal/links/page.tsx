import LinksTab from "@/components/dashboard/tabs/LinksTab";
import { requirePortalTab } from "@/lib/portalAccess";
import { getSiteOrigin } from "@/lib/site";
import { getUtmPerformance, listUtmLinks } from "@/lib/utmLinkStore";

/**
 * UTM LINKS: build tagged links for every channel, keep them in one
 * shared list, and see what each one brought in.
 *
 * Links are built against the domain this page is being served on, so
 * what staff copy is always the live site — never localhost, never a
 * preview deployment's URL unless that's where they are.
 */
export default async function PortalLinksPage() {
  await requirePortalTab("links");
  const [origin, links, performance] = await Promise.all([
    getSiteOrigin(),
    listUtmLinks().catch(() => null),
    getUtmPerformance(90),
  ]);
  return <LinksTab origin={origin} links={links} performance={performance} />;
}
