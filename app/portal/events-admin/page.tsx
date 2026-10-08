import EventsAdminTab from "@/components/dashboard/tabs/EventsAdminTab";
import EventEditor from "@/components/dashboard/events/EventEditor";
import EventManager from "@/components/dashboard/events/EventManager";
import MediaLibrary from "@/components/portal/MediaLibrary";
import { getEventsAdminOverview } from "@/lib/eventsAdmin";
import { getCustomEvent, listCustomEvents } from "@/lib/eventsStore";
import { listMedia } from "@/lib/media";
import { requirePortalTab } from "@/lib/portalAccess";

const NOTICES: Record<string, string> = {
  eventSaved: "Saved.",
  eventPublished: "Published. It is on /events now.",
  eventDeleted: "Event deleted.",
};

export default async function PortalEventsAdminPage(props: PageProps<"/portal/events-admin">) {
  const { account } = await requirePortalTab("events-admin");
  const params = (await props.searchParams) as Record<string, string | string[] | undefined>;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const data = await getEventsAdminOverview();

  // Created events fail soft here, unlike the overview above. The guest
  // lists are the thing staff came for; losing the editor because 0047
  // has not been run yet should not take the whole tab down with it.
  const custom = await listCustomEvents().catch((err) => {
    console.error("Couldn't list created events:", err);
    return [];
  });

  // Booked counts come from the overview that is already loaded rather
  // than from a second query per event.
  const bookedByEvent = new Map<string, number>();
  for (const summary of [...data.upcoming, ...data.past]) {
    bookedByEvent.set(summary.event.id, summary.totalGuests);
  }

  const edit = first("edit");
  const editing = edit === "new" ? null : edit ? await getCustomEvent(edit).catch(() => null) : undefined;

  const media = await listMedia(account.code).catch(() => []);
  const notice = Object.keys(NOTICES).find((key) => first(key) === "1");
  const rawError = first("eventError");

  return (
    <div className="flex flex-col gap-6">
      {rawError && (
        <p className="rounded-lg border border-flame-1/40 bg-flame-1/10 px-4 py-3 text-sm text-flame-3">
          {rawError === "server" ? "Something went wrong. Try again." : rawError}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-flame-2/40 bg-flame-2/10 px-4 py-3 text-sm text-flame-3">
          {NOTICES[notice]}
        </p>
      )}

      {/* `undefined` is "not editing"; `null` is "editing a new one". A
          single falsy check would conflate the two and open the editor on
          every page load. */}
      {edit !== undefined ? (
        <EventEditor event={editing ?? null} />
      ) : (
        <EventManager events={custom} bookedByEvent={bookedByEvent} />
      )}

      <EventsAdminTab data={data} />
      <MediaLibrary code={account.code} kind="event" items={media} />
    </div>
  );
}
