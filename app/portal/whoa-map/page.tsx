import WhoaMapTab from "@/components/dashboard/tabs/WhoaMapTab";
import { flag, text, type PortalSearchParams } from "@/components/portal/PortalNotices";
import { approvedPins, pendingPins, unplacedPins } from "@/lib/whoaMap";
import { requirePortalTab } from "@/lib/portalAccess";

const NOTICES: Record<string, string> = {
  "1": "Approved and on the map.",
  unplaced:
    "Approved, but we couldn't find that place, so it isn't on the map yet. It's in the list below.",
};

export default async function PortalWhoaMapPage(props: PageProps<"/portal/whoa-map">) {
  await requirePortalTab("whoa-map");
  const params = (await props.searchParams) as PortalSearchParams;

  // Three reads, each allowed to fail on its own. The queue is the
  // reason somebody opened this page; a count that will not load is no
  // reason to deny them the queue.
  const [pending, unplaced, approved] = await Promise.all([
    pendingPins().catch((err) => {
      console.error("Couldn't load pending pins:", err);
      return [];
    }),
    unplacedPins().catch((err) => {
      console.error("Couldn't load unplaced pins:", err);
      return [];
    }),
    approvedPins()
      .then((pins) => pins.length)
      .catch(() => 0),
  ]);

  const approvedNotice = text(params, "mapApproved");

  return (
    <WhoaMapTab
      pending={pending}
      unplaced={unplaced}
      approved={approved}
      notice={
        approvedNotice
          ? (NOTICES[approvedNotice] ?? NOTICES["1"])
          : flag(params, "mapRejected")
            ? "Rejected, and the photo is deleted."
            : flag(params, "mapPlaced")
              ? "Found it. It's on the map now."
              : undefined
      }
      error={text(params, "mapError")}
    />
  );
}
