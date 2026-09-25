import ArtAdminTab from "@/components/dashboard/tabs/ArtAdminTab";
import PortalNotices, { type PortalSearchParams } from "@/components/portal/PortalNotices";
import { getPendingArtBatches, getPendingArtProductRequests } from "@/lib/artCollective";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalArtAdminPage(props: PageProps<"/portal/art-admin">) {
  await requirePortalTab("art-admin");
  const params = (await props.searchParams) as PortalSearchParams;
  const [batches, requests] = await Promise.all([
    getPendingArtBatches(),
    getPendingArtProductRequests(),
  ]);

  return (
    <>
      <PortalNotices params={params} />
      <ArtAdminTab batches={batches} requests={requests} />
    </>
  );
}
