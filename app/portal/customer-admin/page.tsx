import CustomerAdmin from "@/components/dashboard/customer/CustomerAdmin";
import { getCustomerDirectory } from "@/lib/customerDirectory";
import { requirePortalTab } from "@/lib/portalAccess";

/**
 * Every customer's email, phone and address in one place, so it is
 * fetched only behind the gate — never loaded and then hidden, which
 * would still ship the whole directory in the page's payload.
 */
export default async function PortalCustomerAdminPage() {
  await requirePortalTab("customer-admin");
  const directory = await getCustomerDirectory();
  return <CustomerAdmin initial={directory} />;
}
