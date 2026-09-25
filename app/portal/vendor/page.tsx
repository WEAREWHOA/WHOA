import VendorTab from "@/components/dashboard/tabs/VendorTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { getArtist } from "@/lib/artists";
import { canSubmitProducts, getProductsForAccount } from "@/lib/artCollective";
import { allowedKinds, listMedia } from "@/lib/media";
import { getVendorProducts, getVendorStats } from "@/lib/vendor";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalVendorPage(props: PageProps<"/portal/vendor">) {
  const { account } = await requirePortalTab("vendor");
  const params = (await props.searchParams) as PortalSearchParams;

  const artist = account.vendorSlug ? getArtist(account.vendorSlug) : undefined;
  const [products, stats, submissions, media] = await Promise.all([
    artist ? getVendorProducts(artist.slug) : Promise.resolve(undefined),
    artist ? getVendorStats(artist.slug) : Promise.resolve(undefined),
    canSubmitProducts(account.permissions) ? getProductsForAccount(account.code) : Promise.resolve([]),
    listMedia(account.code).catch(() => []),
  ]);

  return (
    <>
      <PortalNotices params={params} />
      <VendorTab
        vendorName={artist?.name}
        stats={stats}
        products={products}
        code={account.code}
        canSubmit={account.permissions.vendor}
        submissions={submissions}
        submitted={flag(params, "artProductSubmitted")}
        submitError={text(params, "artProductError")}
        photoError={flag(params, "artPhotoError")}
      />
      {allowedKinds(account.permissions).includes("vendor") && (
        <MediaLibrary code={account.code} kind="vendor" items={media} />
      )}
    </>
  );
}
