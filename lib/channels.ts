/**
 * Where a visit came from.
 *
 * Two signals, in order of trust: the campaign tags we put on our own
 * links, then the referring host. A tag is a deliberate statement by
 * whoever made the link; a referrer is whatever the browser felt like
 * sending, and plenty of apps send nothing at all.
 *
 * The result is stored on the row rather than derived at read time. These
 * rules will change — a new platform, a new campaign convention — and a
 * change to them must never silently rewrite what last month looked like.
 */

export interface Channel {
  /** Stored in page_views.channel. */
  id: string;
  label: string;
  /** The broad family, for grouping the outer ring of the journey map. */
  group: "social" | "search" | "direct" | "print" | "email" | "referral" | "paid";
}

export const CHANNELS: Channel[] = [
  { id: "instagram", label: "Instagram", group: "social" },
  { id: "tiktok", label: "TikTok", group: "social" },
  { id: "facebook", label: "Facebook", group: "social" },
  { id: "youtube", label: "YouTube", group: "social" },
  { id: "x", label: "X / Twitter", group: "social" },
  { id: "snapchat", label: "Snapchat", group: "social" },
  { id: "pinterest", label: "Pinterest", group: "social" },
  { id: "reddit", label: "Reddit", group: "social" },
  { id: "linktree", label: "Link in bio", group: "social" },
  { id: "google", label: "Google", group: "search" },
  { id: "search", label: "Other search", group: "search" },
  { id: "email", label: "Email", group: "email" },
  { id: "paid", label: "Paid ads", group: "paid" },
  { id: "qr", label: "QR / print", group: "print" },
  { id: "referral", label: "Other sites", group: "referral" },
  { id: "direct", label: "Direct", group: "direct" },
];

const BY_ID = new Map(CHANNELS.map((c) => [c.id, c]));

export function channelById(id: string | null | undefined): Channel {
  return (id && BY_ID.get(id)) || BY_ID.get("direct")!;
}

/** Host fragments → channel id. Checked as substrings, longest first. */
const HOST_RULES: Array<[string, string]> = [
  ["instagram", "instagram"],
  ["tiktok", "tiktok"],
  ["facebook", "facebook"],
  ["fb.", "facebook"],
  ["youtube", "youtube"],
  ["youtu.be", "youtube"],
  ["twitter", "x"],
  ["t.co", "x"],
  ["snapchat", "snapchat"],
  ["pinterest", "pinterest"],
  ["reddit", "reddit"],
  ["linktr.ee", "linktree"],
  ["beacons.", "linktree"],
  ["google", "google"],
  ["bing", "search"],
  ["duckduckgo", "search"],
  ["yahoo", "search"],
  ["ecosia", "search"],
  ["mail.", "email"],
  ["gmail", "email"],
  ["outlook", "email"],
];

/** Campaign tag values → channel id, for our own links. */
const SOURCE_RULES: Array<[string, string]> = [
  ["instagram", "instagram"],
  ["ig", "instagram"],
  ["tiktok", "tiktok"],
  ["facebook", "facebook"],
  ["fb", "facebook"],
  ["youtube", "youtube"],
  ["twitter", "x"],
  ["snapchat", "snapchat"],
  ["pinterest", "pinterest"],
  ["reddit", "reddit"],
  ["linktree", "linktree"],
  ["google", "google"],
  ["email", "email"],
  ["newsletter", "email"],
  ["klaviyo", "email"],
  ["mailchimp", "email"],
  ["qr", "qr"],
  ["flyer", "qr"],
  ["print", "qr"],
  ["sticker", "qr"],
];

/** Landing pages that exist to be reached by a printed code. */
const PRINTED_LANDINGS = ["/go", "/water"];

export function classifyChannel(input: {
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  path?: string | null;
}): string {
  const medium = input.utmMedium?.trim().toLowerCase() ?? "";
  const source = input.utmSource?.trim().toLowerCase() ?? "";
  const host = input.referrerHost?.trim().toLowerCase() ?? "";

  // A paid medium wins outright: knowing it cost money matters more than
  // knowing which network it ran on, and the network is still on the row.
  if (/^(cpc|ppc|paid|paidsocial|paid_social|display|cpm)$/.test(medium)) return "paid";

  for (const [needle, id] of SOURCE_RULES) {
    if (source === needle || source.includes(needle)) return id;
  }
  if (/^(email|newsletter)$/.test(medium)) return "email";
  if (medium === "qr" || medium === "print") return "qr";

  for (const [needle, id] of HOST_RULES) {
    if (host.includes(needle)) return id;
  }

  // No referrer and no tags, landing on a page that only exists on a
  // flyer or a bottle: that's a scan, not a mystery. An honest guess,
  // and the reason those URLs are worth tagging properly one day.
  if (!host && !source && input.path && PRINTED_LANDINGS.includes(input.path)) return "qr";

  if (host) return "referral";
  return "direct";
}
