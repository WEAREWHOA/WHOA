import SettingsTab from "@/components/dashboard/tabs/SettingsTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { allowedKinds, listMedia } from "@/lib/media";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalSettingsPage(props: PageProps<"/portal/settings">) {
  const { account } = await requirePortalTab("settings");
  const params = (await props.searchParams) as PortalSearchParams;
  const media = await listMedia(account.code).catch(() => []);

  return (
    <>
      <PortalNotices params={params} />
      <SettingsTab
        account={account}
        settingsSaved={flag(params, "settingsSaved")}
        passwordChanged={flag(params, "passwordChanged")}
        settingsError={text(params, "settingsError")}
      />
      {allowedKinds(account.permissions).includes("profile") && (
        <MediaLibrary code={account.code} kind="profile" items={media} />
      )}
    </>
  );
}
