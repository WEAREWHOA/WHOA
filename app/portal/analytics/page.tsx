import AnalyticsTab from "@/components/dashboard/tabs/AnalyticsTab";
import { getJourneyMap } from "@/lib/journeys";
import { getAnalytics } from "@/lib/kpiReport";
import { requirePortalTab } from "@/lib/portalAccess";

/**
 * The heaviest page in the portal, and the whole reason the dashboard
 * was split: this used to run on every portal visit for anyone holding
 * the permission, whatever they'd actually come to look at.
 */
export default async function PortalAnalyticsPage() {
  await requirePortalTab("analytics");
  const [snapshot, journey] = await Promise.all([getAnalytics(30), getJourneyMap(30)]);
  return <AnalyticsTab initial={snapshot} initialJourney={journey} />;
}
