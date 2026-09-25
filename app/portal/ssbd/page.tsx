import SsbdTab from "@/components/dashboard/tabs/SsbdTab";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalSsbdPage() {
  await requirePortalTab("ssbd");
  return <SsbdTab />;
}
