import EventsAdminTab from "@/components/dashboard/tabs/EventsAdminTab";
import { getEventsAdminOverview } from "@/lib/eventsAdmin";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalEventsAdminPage() {
  await requirePortalTab("events-admin");
  const data = await getEventsAdminOverview();
  return <EventsAdminTab data={data} />;
}
