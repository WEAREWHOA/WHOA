"use server";

import { revalidatePath } from "next/cache";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { checkInRsvp, parseTicketId, undoCheckIn, type CheckInOutcome } from "@/lib/eventRsvps";
import type { Ambassador } from "@/lib/types";

/**
 * Who may work a door.
 *
 * `rsvpAdmin` is the permission for it, but anyone already trusted with the
 * whole events backend can obviously admit a guest, and a Super Admin can
 * do anything — so both pass too. Checked server-side on every scan, not
 * just by hiding the tab: the action is a POST endpoint like any other.
 */
async function requireDoorStaff(): Promise<Ambassador | undefined> {
  const code = await getSessionAmbassadorCode();
  if (!code) return undefined;

  const account = await getByCode(code);
  if (!account) return undefined;
  if (account.isSuperAdmin || account.permissions.rsvpAdmin || account.permissions.eventsAdmin) {
    return account;
  }
  return undefined;
}

/** What the scanner UI gets back for one scan. */
export type ScanResult =
  | {
      status: CheckInOutcome["status"];
      name?: string;
      eventId?: string;
      checkedInAt?: string;
      checkedInBy?: string;
    }
  /** Not signed in, or not door staff — distinct from a refused ticket. */
  | { status: "unauthorized" }
  /** The camera read something that isn't one of our tickets at all. */
  | { status: "unreadable" }
  | { status: "error"; message: string };

/**
 * Scans one ticket.
 *
 * Returns a result rather than redirecting: the scanner stays on screen and
 * keeps reading, and the door needs the answer in a banner, not a page
 * load. Every refusal reason is kept distinct, because "no" and "no,
 * because they already came in at 9:42" are different conversations to
 * have with someone standing in front of you.
 */
export async function scanTicketAction(
  scanned: string,
  expectedEventId?: string,
): Promise<ScanResult> {
  const account = await requireDoorStaff();
  if (!account) return { status: "unauthorized" };

  const rsvpId = parseTicketId(scanned);
  if (!rsvpId) return { status: "unreadable" };

  try {
    const outcome = await checkInRsvp(rsvpId, account.code, expectedEventId);
    if (outcome.status === "not-found") return { status: "not-found" };

    return {
      status: outcome.status,
      name: outcome.rsvp.name,
      eventId: outcome.rsvp.eventId,
      checkedInAt: outcome.rsvp.checkedInAt ?? undefined,
      checkedInBy: outcome.rsvp.checkedInBy ?? undefined,
    };
  } catch (err) {
    console.error("scanTicketAction failed:", err);
    return { status: "error", message: "Couldn't reach the guest list — try again." };
  }
}

/** The manual path: tap a name on the door list instead of scanning. */
export async function checkInByIdAction(formData: FormData): Promise<void> {
  const account = await requireDoorStaff();
  if (!account) return;

  const rsvpId = String(formData.get("rsvpId") || "").trim();
  const eventId = String(formData.get("eventId") || "").trim() || undefined;
  if (!rsvpId) return;

  try {
    await checkInRsvp(rsvpId, account.code, eventId);
  } catch (err) {
    console.error("checkInByIdAction failed:", err);
  }

  revalidatePath(`/portal/${account.code}`);
  revalidatePath(`/checkin/${rsvpId}`);
}

/** Undoes a mis-scan, so a refused-but-real guest can still be let in. */
export async function undoCheckInAction(formData: FormData): Promise<void> {
  const account = await requireDoorStaff();
  if (!account) return;

  const rsvpId = String(formData.get("rsvpId") || "").trim();
  if (!rsvpId) return;

  try {
    await undoCheckIn(rsvpId);
  } catch (err) {
    console.error("undoCheckInAction failed:", err);
  }

  revalidatePath(`/portal/${account.code}`);
  revalidatePath(`/checkin/${rsvpId}`);
}
