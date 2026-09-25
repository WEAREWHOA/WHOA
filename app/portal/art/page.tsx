import ArtTab from "@/components/dashboard/tabs/ArtTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import {
  canSubmitProducts,
  getArtInventory,
  getArtProfile,
  getArtStats,
  getProductsForAccount,
} from "@/lib/artCollective";
import { allowedKinds, listMedia } from "@/lib/media";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalArtPage(props: PageProps<"/portal/art">) {
  const { account } = await requirePortalTab("art");
  const params = (await props.searchParams) as PortalSearchParams;

  const [profile, stats, inventory, products, media] = await Promise.all([
    getArtProfile(account.code),
    getArtStats(account.code),
    getArtInventory(account.code),
    canSubmitProducts(account.permissions) ? getProductsForAccount(account.code) : Promise.resolve([]),
    listMedia(account.code).catch(() => []),
  ]);

  return (
    <>
      <PortalNotices params={params} />
      <ArtTab
        code={account.code}
        hasArtAccess={account.permissions.art}
        profile={profile}
        stats={stats}
        inventory={inventory}
        products={products}
        saved={flag(params, "artSaved")}
        error={text(params, "artError")}
        productSubmitted={flag(params, "artProductSubmitted")}
        productError={text(params, "artProductError")}
        photoError={flag(params, "artPhotoError")}
      />
      {allowedKinds(account.permissions).includes("art") && (
        <MediaLibrary code={account.code} kind="art" items={media} />
      )}
    </>
  );
}
