"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePortalTab } from "@/lib/portalAccess";
import { approvePin, rejectPin, replacePin } from "@/lib/whoaMap";
import { portalPath } from "@/lib/portalNav";

/**
 * Deciding what goes on the public map.
 *
 * Every one of these revalidates /whoa-map as well as the queue.
 * The public page is cached for an hour, and an approval that does not
 * show up until the hour is out reads as a broken button, which is how
 * somebody ends up pressing it four times.
 */

function refresh() {
  revalidatePath("/whoa-map");
}

export async function approvePinAction(formData: FormData) {
  const { account } = await requirePortalTab("whoa-map");
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("whoa-map", "mapError=invalid"));

  try {
    const { placed } = await approvePin(id, account.code);
    refresh();
    // Said out loud when the geocoder could not place it. The pin is
    // live either way, but one that is live and unplaced is invisible
    // on the map, and silently publishing nothing is worse than
    // failing loudly.
    redirect(portalPath("whoa-map", placed ? "mapApproved=1" : "mapApproved=unplaced"));
  } catch (err) {
    unstable_rethrow(err);
    console.error("approvePinAction failed:", err);
    redirect(portalPath("whoa-map", "mapError=server"));
  }
}

export async function rejectPinAction(formData: FormData) {
  const { account } = await requirePortalTab("whoa-map");
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("whoa-map", "mapError=invalid"));

  try {
    await rejectPin(id, account.code);
    refresh();
    redirect(portalPath("whoa-map", "mapRejected=1"));
  } catch (err) {
    unstable_rethrow(err);
    console.error("rejectPinAction failed:", err);
    redirect(portalPath("whoa-map", "mapError=server"));
  }
}

/** Try the geocoder again on one that went live without a point. */
export async function replacePinAction(formData: FormData) {
  await requirePortalTab("whoa-map");
  const id = String(formData.get("id") || "").trim();
  if (!id) redirect(portalPath("whoa-map", "mapError=invalid"));

  try {
    const { placed } = await replacePin(id);
    refresh();
    redirect(portalPath("whoa-map", placed ? "mapPlaced=1" : "mapError=geocode"));
  } catch (err) {
    unstable_rethrow(err);
    console.error("replacePinAction failed:", err);
    redirect(portalPath("whoa-map", "mapError=geocode"));
  }
}
