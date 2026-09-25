import MusicTab from "@/components/dashboard/tabs/MusicTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { canSubmitProducts, getProductsForAccount } from "@/lib/artCollective";
import { allowedKinds, listMedia } from "@/lib/media";
import { getMusicianProfile } from "@/lib/musicianProfiles";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalMusicPage(props: PageProps<"/portal/music">) {
  const { account } = await requirePortalTab("music");
  const params = (await props.searchParams) as PortalSearchParams;

  const [profile, submissions, media] = await Promise.all([
    getMusicianProfile(account.code),
    canSubmitProducts(account.permissions) ? getProductsForAccount(account.code) : Promise.resolve([]),
    listMedia(account.code).catch(() => []),
  ]);

  return (
    <>
      <PortalNotices params={params} />
      <MusicTab
        code={account.code}
        hasMusicAccess={account.permissions.music}
        profile={profile}
        saved={flag(params, "musicSaved")}
        error={text(params, "musicError")}
        submissions={submissions}
        submitted={flag(params, "artProductSubmitted")}
        submitError={text(params, "artProductError")}
        photoError={flag(params, "artPhotoError")}
      />
      {allowedKinds(account.permissions).includes("music") && (
        <MediaLibrary code={account.code} kind="music" items={media} />
      )}
    </>
  );
}
