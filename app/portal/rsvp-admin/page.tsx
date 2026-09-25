import RsvpAdminTab from "@/components/dashboard/tabs/RsvpAdminTab";
import { getDoorEvents } from "@/lib/door";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalRsvpAdminPage() {
  await requirePortalTab("rsvp-admin");
  const events = await getDoorEvents();
  return <RsvpAdminTab events={events} />;
}
