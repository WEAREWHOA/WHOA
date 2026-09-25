import RolodexTab from "@/components/dashboard/tabs/RolodexTab";
import { listContacts } from "@/lib/rolodex";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalRolodexPage() {
  await requirePortalTab("rolodex");
  // Holds real people's personal phone numbers, so it is fetched only
  // behind the gate above — never loaded and then hidden.
  const contacts = await listContacts().catch(() => []);
  return <RolodexTab contacts={contacts} />;
}
