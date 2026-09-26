/**
 * The portal's tabs, as routes.
 *
 * One list, used by the tab bar, the access check and every redirect in
 * the app. Adding a tab means adding a row here and a folder — not
 * editing a switcher, a props list and a visibility object in three
 * different files, which is what it used to mean.
 */

export type PortalTabId =
  | "customer" | "events" | "ambassador" | "vendor" | "art" | "music"
  | "ssbd" | "analytics" | "ba-admin" | "events-admin" | "rsvp-admin"
  | "rolodex" | "event-sales" | "art-admin" | "settings";

export interface PortalTab {
  id: PortalTabId;
  /** Path segment under /portal. Empty for the default tab. */
  slug: string;
  label: string;
  /** Shown to every signed-in account, no permission required. */
  always?: boolean;
}

export const PORTAL_TABS: PortalTab[] = [
  { id: "customer", slug: "", label: "CUSTOMER", always: true },
  { id: "events", slug: "events", label: "EVENTS", always: true },
  { id: "ambassador", slug: "ambassador", label: "BRAND AMBASSADORS" },
  { id: "vendor", slug: "vendor", label: "ARTIST/VENDOR" },
  { id: "art", slug: "art", label: "ART" },
  { id: "music", slug: "music", label: "MUSIC" },
  { id: "ssbd", slug: "ssbd", label: "SSBD" },
  { id: "analytics", slug: "analytics", label: "ANALYTICS" },
  { id: "ba-admin", slug: "ba-admin", label: "BA ADMIN" },
  { id: "events-admin", slug: "events-admin", label: "EVENTS ADMIN" },
  { id: "rsvp-admin", slug: "rsvp-admin", label: "RSVP ADMIN" },
  { id: "rolodex", slug: "rolodex", label: "ROLODEX" },
  { id: "event-sales", slug: "event-sales", label: "EVENT SALES" },
  { id: "art-admin", slug: "art-admin", label: "ART ADMIN" },
  { id: "settings", slug: "settings", label: "SETTINGS", always: true },
];

const BY_ID = new Map(PORTAL_TABS.map((t) => [t.id, t]));

/**
 * A portal URL. No account code: the session already says who you are,
 * so putting the code in the path only gave it one legal value and
 * leaked it into history, screenshots and analytics.
 */
export function portalPath(tab: PortalTabId = "customer", query?: string): string {
  const slug = BY_ID.get(tab)?.slug ?? "";
  const base = slug ? `/portal/${slug}` : "/portal";
  return query ? `${base}?${query}` : base;
}

/** Where a media upload of this kind should land afterwards. */
export function tabForMediaKind(kind: string): PortalTabId {
  switch (kind) {
    case "ambassador": return "ambassador";
    case "vendor": return "vendor";
    case "art": return "art";
    case "music": return "music";
    case "eventSales": return "event-sales";
    default: return "settings";
  }
}

/**
 * Where to send someone after a product submission or change request.
 *
 * The art, music and vendor tabs share one submission pipeline, so the
 * action can't tell from the form which tab it was posted from — but it
 * can tell which of those tabs the account is actually allowed to open,
 * and that is always somewhere they can see the result.
 */
export function tabForSubmitter(p: {
  art: boolean;
  music: boolean;
  vendor: boolean;
}): PortalTabId {
  if (p.art) return "art";
  if (p.music) return "music";
  if (p.vendor) return "vendor";
  return "customer";
}
