import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "./auth";
import { getByCode } from "./store";
import type { PortalTabId } from "./portalNav";
import type { Ambassador } from "./types";

/**
 * Who is looking at the portal, and what they're allowed to open.
 *
 * Every portal route calls this. Splitting the dashboard into routes
 * moved the permission check from one page that had to get fourteen
 * gates right in a row to one gate per page, checked on the server
 * before that page's data is fetched at all.
 */

export interface PortalAccess {
  account: Ambassador;
  can: Record<PortalTabId, boolean>;
  /** Vendor needs a slug as well as the permission to have anything to show. */
  showVendor: boolean;
}

export async function requirePortal(): Promise<PortalAccess> {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login?from=/portal");

  const account = await getByCode(code);
  if (!account) redirect("/login?from=/portal");

  const p = account.permissions;
  const admin = account.isSuperAdmin;
  const showVendor = p.vendor && Boolean(account.vendorSlug);

  return {
    account,
    showVendor,
    can: {
      customer: true,
      events: true,
      settings: true,
      ambassador: p.ambassador,
      vendor: showVendor,
      art: p.art,
      music: p.music,
      ssbd: p.ssbd,
      analytics: admin || p.analytics,
      "events-admin": admin || p.eventsAdmin,
      // Events admins keep the door: nobody who could admit guests before
      // this tab existed loses that.
      "rsvp-admin": admin || p.rsvpAdmin || p.eventsAdmin,
      rolodex: admin || p.rolodex,
      "event-sales": p.eventSales,
      "art-admin": admin || p.artAdmin,
    },
  };
}

/**
 * The same, but refuses a tab this account can't open.
 *
 * Sent back to the portal's front page rather than shown a 404: someone
 * following a stale link to a tab that was revoked should land somewhere
 * useful, not on an error.
 */
export async function requirePortalTab(tab: PortalTabId): Promise<PortalAccess> {
  const access = await requirePortal();
  if (!access.can[tab]) redirect("/portal");
  return access;
}
