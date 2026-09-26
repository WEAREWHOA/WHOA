import BaAdmin from "@/components/dashboard/ba/BaAdmin";
import { getBaAdminData } from "@/lib/baAdmin";
import { requirePortalTab } from "@/lib/portalAccess";

/**
 * Every ambassador's commission and payout details in one place, so it
 * is fetched only behind the gate — never loaded and then hidden, which
 * would still ship the whole roster in the page's payload.
 */
export default async function PortalBaAdminPage() {
  await requirePortalTab("ba-admin");
  const data = await getBaAdminData();
  return <BaAdmin initial={data} />;
}
