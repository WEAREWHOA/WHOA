import NewsletterTab from "@/components/dashboard/newsletter/NewsletterTab";
import { getNewsletterList } from "@/lib/newsletter";
import { requirePortalTab } from "@/lib/portalAccess";

/**
 * Every subscriber's email address, so it is fetched only behind the gate
 * -- never loaded and then hidden, which would still ship the whole list
 * in the page's payload.
 */
export default async function PortalNewsletterPage() {
  await requirePortalTab("newsletter");
  const list = await getNewsletterList();
  return <NewsletterTab initial={list} />;
}
