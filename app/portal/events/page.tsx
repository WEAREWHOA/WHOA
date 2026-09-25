import EventsTab from "@/components/dashboard/tabs/EventsTab";
import { getEventHistoryForAccount } from "@/lib/eventRsvps";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalEventsPage() {
  const { account } = await requirePortalTab("events");
  const history = await getEventHistoryForAccount(account.code);
  return <EventsTab upcoming={history.upcoming} past={history.past} />;
}
