import { channelById, classifyChannel, sourceRuleFor } from "./channels";

/**
 * The UTM link builder's rules, in one place.
 *
 * Client-safe on purpose — no Supabase, no next/headers — because the
 * builder previews every link live in the browser. The saved library
 * lives in lib/utmLinkStore.ts.
 *
 * The whole point is that nobody types a utm_source by hand. Every value
 * a placement produces is one classifyChannel() already files under the
 * right channel, so "Instagram", "insta" and "IG" can't turn into three
 * rows on the dashboard.
 */

export interface UtmPlacement {
  /** Stable key for the picker. */
  id: string;
  label: string;
  source: string;
  medium: string;
}

export interface UtmPlatform {
  id: string;
  label: string;
  placements: UtmPlacement[];
}

function p(platform: string, id: string, label: string, source: string, medium: string): UtmPlacement {
  return { id: `${platform}:${id}`, label, source, medium };
}

/**
 * Every place a link goes out from. Source is the platform the person was
 * on when they tapped; medium is what kind of link it was. Paid
 * placements use paid_social / cpc, which the dashboard files under
 * "Paid ads" whatever the network — the network is still on the row.
 */
export const UTM_PLATFORMS: UtmPlatform[] = [
  {
    id: "instagram",
    label: "Instagram",
    placements: [
      p("instagram", "bio", "Bio link", "instagram", "bio"),
      p("instagram", "story", "Story", "instagram", "story"),
      p("instagram", "post", "Post", "instagram", "post"),
      p("instagram", "reel", "Reel", "instagram", "reel"),
      p("instagram", "dm", "DM", "instagram", "dm"),
      p("instagram", "broadcast", "Broadcast channel", "instagram", "broadcast"),
      p("instagram", "paid", "Ad", "instagram", "paid_social"),
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    placements: [
      p("tiktok", "bio", "Bio link", "tiktok", "bio"),
      p("tiktok", "video", "Video", "tiktok", "video"),
      p("tiktok", "live", "Live", "tiktok", "live"),
      p("tiktok", "dm", "DM", "tiktok", "dm"),
      p("tiktok", "paid", "Ad", "tiktok", "paid_social"),
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    placements: [
      p("facebook", "post", "Post", "facebook", "post"),
      p("facebook", "story", "Story", "facebook", "story"),
      p("facebook", "event", "Event page", "facebook", "event"),
      p("facebook", "paid", "Ad", "facebook", "paid_social"),
    ],
  },
  {
    id: "youtube",
    label: "YouTube",
    placements: [
      p("youtube", "description", "Video description", "youtube", "description"),
      p("youtube", "shorts", "Shorts", "youtube", "shorts"),
      p("youtube", "community", "Community post", "youtube", "community"),
    ],
  },
  {
    id: "snapchat",
    label: "Snapchat",
    placements: [
      p("snapchat", "story", "Story", "snapchat", "story"),
      p("snapchat", "profile", "Profile", "snapchat", "bio"),
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    placements: [p("pinterest", "pin", "Pin", "pinterest", "pin")],
  },
  {
    id: "x",
    label: "X / Twitter",
    placements: [
      p("x", "post", "Post", "twitter", "post"),
      p("x", "bio", "Bio link", "twitter", "bio"),
    ],
  },
  {
    id: "reddit",
    label: "Reddit",
    placements: [p("reddit", "post", "Post", "reddit", "post")],
  },
  {
    id: "email",
    label: "Email",
    placements: [
      p("email", "newsletter", "Newsletter", "newsletter", "email"),
      p("email", "direct", "One-off email", "email", "email"),
    ],
  },
  {
    id: "print",
    label: "QR / Print",
    placements: [
      p("print", "flyer", "Flyer / poster", "qr", "flyer"),
      p("print", "sticker", "Sticker", "qr", "sticker"),
      p("print", "packaging", "Packaging / bottle", "qr", "packaging"),
      p("print", "event", "At an event", "qr", "event"),
    ],
  },
  {
    id: "google",
    label: "Google",
    placements: [p("google", "ads", "Search ad", "google", "cpc")],
  },
];

const PLACEMENT_BY_ID = new Map(
  UTM_PLATFORMS.flatMap((platform) => platform.placements.map((pl) => [pl.id, pl] as const)),
);

export function placementById(id: string): UtmPlacement | undefined {
  return PLACEMENT_BY_ID.get(id);
}

export function platformForPlacement(id: string): UtmPlatform | undefined {
  return UTM_PLATFORMS.find((platform) => platform.placements.some((pl) => pl.id === id));
}

/** Pages people actually get sent to, offered as suggestions — any path works. */
export const SUGGESTED_PATHS = [
  "/",
  "/shop",
  "/events",
  "/oasis",
  "/water",
  "/go",
  "/join",
  "/ambassadors",
  "/art-collective",
  "/music-collective",
  "/custom-design",
  "/same-same-but-whoa",
  "/podcast",
  "/games",
  "/about",
  "/contact",
];

/**
 * A tag value as the dashboard should see it: lowercase, hyphens for
 * spaces, nothing a URL would have to escape. "Fall Drop 2026!" becomes
 * "fall-drop-2026", the same thing whoever typed it.
 */
export function slugifyTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * A site path, cleaned: always a leading slash, no origin, no query or
 * hash of its own (the tags are the query). Someone pasting a full URL
 * from the address bar gets just the path out of it.
 */
export function normalizeLinkPath(value: string): string {
  let raw = value.trim();
  if (!raw) return "/";
  try {
    if (/^https?:\/\//i.test(raw)) raw = new URL(raw).pathname;
  } catch {
    // Not a URL after all; treat it as a path.
  }
  raw = raw.split(/[?#]/)[0] ?? "";
  if (!raw.startsWith("/")) raw = `/${raw}`;
  return raw.replace(/\/{2,}/g, "/").slice(0, 300) || "/";
}

export interface UtmTags {
  path: string;
  source: string;
  medium: string;
  campaign: string;
  /** Optional: which exact post or button. Read by Google Analytics and the portal alike. */
  content?: string;
}

export function buildUtmUrl(origin: string, tags: UtmTags): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("utm_source", tags.source);
  params.set("utm_medium", tags.medium);
  params.set("utm_campaign", tags.campaign);
  if (tags.content) params.set("utm_content", tags.content);
  return `${base}${normalizeLinkPath(tags.path)}?${params.toString()}`;
}

/** The channel this link will be filed under on the dashboard. */
export function previewChannel(tags: Pick<UtmTags, "source" | "medium" | "path">) {
  return channelById(
    classifyChannel({ utmSource: tags.source, utmMedium: tags.medium, path: normalizeLinkPath(tags.path) }),
  );
}

/**
 * Anything about a custom source that would put the link in the wrong
 * place. Presets never trip this; it exists for the "custom" box.
 */
export function sourceWarning(source: string): string | null {
  const clean = source.trim().toLowerCase();
  if (!clean) return null;
  const rule = sourceRuleFor(clean);
  if (!rule) {
    return `"${clean}" isn't a source the dashboard recognises, so these visits will show up as Direct (or by whatever referrer the app sends).`;
  }
  if (!rule.exact) {
    return `"${clean}" contains "${rule.needle}", so it will be counted as ${channelById(rule.channelId).label}. Use one of the standard sources if that isn't what you mean.`;
  }
  return null;
}

/**
 * The key a set of tags is matched on against page_views. Lowercased: the
 * tags arrive as typed. Content is part of it, so two stories in the same
 * campaign are two rows rather than one.
 */
export function tagKey(
  source: string | null,
  medium: string | null,
  campaign: string | null,
  content?: string | null,
): string {
  return [source, medium, campaign, content].map((v) => (v ?? "").trim().toLowerCase()).join("\u0000");
}
