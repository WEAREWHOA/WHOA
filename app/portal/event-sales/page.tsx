import EventSalesTab from "@/components/dashboard/tabs/EventSalesTab";
import MediaLibrary from "@/components/portal/MediaLibrary";
import PortalNotices, { text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { EVENTS } from "@/lib/events";
import { getScheduleForAccount, getSignupsForAccount } from "@/lib/eventSales";
import { allowedKinds, listMedia } from "@/lib/media";
import { requirePortalTab } from "@/lib/portalAccess";

export default async function PortalEventSalesPage(props: PageProps<"/portal/event-sales">) {
  const { account } = await requirePortalTab("event-sales");
  const params = (await props.searchParams) as PortalSearchParams;

  const [signups, schedule, media] = await Promise.all([
    getSignupsForAccount(account.code),
    getScheduleForAccount(account.code),
    listMedia(account.code).catch(() => []),
  ]);

  // Pacific, not UTC: toISOString would roll the day over at 5pm local and
  // drop an event people can still sign up to work.
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const upcoming = EVENTS
    .filter((e) => (e.endDate ?? e.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <>
      <PortalNotices params={params} />
      <EventSalesTab
        code={account.code}
        upcoming={upcoming}
        signups={signups}
        schedule={schedule}
        workSignup={text(params, "workSignup")}
      />
      {allowedKinds(account.permissions).includes("eventSales") && (
        <MediaLibrary code={account.code} kind="eventSales" items={media} />
      )}
    </>
  );
}
