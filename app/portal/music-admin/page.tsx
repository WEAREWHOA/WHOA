import MusicAdminTab from "@/components/dashboard/tabs/MusicAdminTab";
import { type PortalSearchParams, flag, text } from "@/components/portal/PortalNotices";
import { listMusicianApplications } from "@/lib/musicianProfiles";
import { listMediaForAccounts } from "@/lib/media";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalMusicAdminPage(props: PageProps<"/portal/music-admin">) {
  await requirePortalTab("music-admin");
  const params = (await props.searchParams) as PortalSearchParams;
  const artists = await listMusicianApplications();

  // How many photos each artist has, from the same two media kinds the
  // public roster builds their card from. The tab can then say which of
  // them has none, instead of that only being visible as a card with no
  // picture on the live site.
  const media = await listMediaForAccounts(
    artists.map((artist) => artist.ambassadorCode),
    ["profile", "music"],
  ).catch(() => new Map<string, unknown[]>());
  const photoCounts = Object.fromEntries(
    artists.map((artist) => [artist.ambassadorCode, media.get(artist.ambassadorCode)?.length ?? 0]),
  );

  return (
    <MusicAdminTab
      artists={artists}
      photoCounts={photoCounts}
      reviewed={text(params, "musicReviewed")}
      visibility={text(params, "musicVisibility")}
      saved={flag(params, "musicAdminSaved")}
      photoAdded={flag(params, "musicPhoto")}
      error={text(params, "musicAdminError")}
    />
  );
}
