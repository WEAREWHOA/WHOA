import AmbassadorTab from "@/components/dashboard/tabs/AmbassadorTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { flag, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { allowedKinds, listMedia } from "@/lib/media";
import { getSiteOrigin } from "@/lib/site";
import { getStats } from "@/lib/store";
import { getTier } from "@/lib/tiers";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalAmbassadorPage(props: PageProps<"/portal/ambassador">) {
  const { account } = await requirePortalTab("ambassador");
  const params = (await props.searchParams) as PortalSearchParams;

  const stats = getStats(account);
  const [origin, media] = await Promise.all([
    getSiteOrigin(),
    // Never fatal: a storage hiccup should cost someone their photo grid,
    // not their whole tab.
    listMedia(account.code).catch(() => []),
  ]);

  return (
    <>
      <PortalNotices params={params} />
      <AmbassadorTab
        ambassador={account}
        stats={stats}
        tier={getTier(stats.orderCount)}
        origin={origin}
        linkAdded={flag(params, "linkAdded")}
        linkDeleted={flag(params, "linkDeleted")}
        payoutSaved={flag(params, "saved")}
      />
      {allowedKinds(account.permissions).includes("ambassador") && (
        <MediaLibrary code={account.code} kind="ambassador" items={media} />
      )}
    </>
  );
}
