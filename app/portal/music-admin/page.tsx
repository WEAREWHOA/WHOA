import MusicAdminTab from "@/components/dashboard/tabs/MusicAdminTab";
import { type PortalSearchParams, flag, text } from "@/components/portal/PortalNotices";
import { listMusicianApplications } from "@/lib/musicianProfiles";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalMusicAdminPage(props: PageProps<"/portal/music-admin">) {
  await requirePortalTab("music-admin");
  const params = (await props.searchParams) as PortalSearchParams;
  const artists = await listMusicianApplications();

  return (
    <MusicAdminTab
      artists={artists}
      reviewed={text(params, "musicReviewed")}
      saved={flag(params, "musicAdminSaved")}
      error={text(params, "musicAdminError")}
    />
  );
}
