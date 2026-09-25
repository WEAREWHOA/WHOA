import { classifyChannel } from "./channels";
import { getSupabase } from "./supabase";

/**
 * Recording a page view.
 *
 * The hard part of first-party traffic isn't the insert, it's everything
 * that isn't a person: crawlers, link previewers, uptime checks and
 * scrapers will all hit /go. Counted as scans they'd turn a 60-visitor
 * night into a 400-visitor one and the number would be believed, so they
 * are dropped here rather than explained away in the dashboard.
 */

/** Substrings that appear in the user agents of things that aren't people. */
const BOT_MARKERS = [
  "bot",
  "crawler",
  "spider",
  "slurp",
  "curl",
  "wget",
  "python-requests",
  "headlesschrome",
  "phantomjs",
  "lighthouse",
  "pingdom",
  "uptimerobot",
  "facebookexternalhit",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "slackbot",
  "embedly",
  "preview",
  "vercel-screenshot",
  "monitoring",
];

export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // A real browser always sends one.
  const ua = userAgent.toLowerCase();
  return BOT_MARKERS.some((marker) => ua.includes(marker));
}

export type Device = "mobile" | "tablet" | "desktop" | "unknown";

export function deviceFrom(userAgent: string | null | undefined): Device {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return "mobile";
  if (/android/.test(ua)) return "tablet";
  if (/mozilla|chrome|safari|firefox|edg/.test(ua)) return "desktop";
  return "unknown";
}

/** Host only. A full referring URL can carry someone's search terms. */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.slice(0, 120) || null;
  } catch {
    return null;
  }
}

/** Drops the query string and trims, so one route is one row group. */
export function normalizePath(path: string): string | null {
  if (!path || !path.startsWith("/")) return null;
  const clean = path.split("?")[0].split("#")[0];
  if (clean.startsWith("/api/")) return null;
  return clean.length > 1 ? clean.replace(/\/+$/, "").slice(0, 300) || "/" : "/";
}

/** utm_* off the landing URL, trimmed to something storable. */
export function utmValue(value: string | null | undefined): string | null {
  const clean = value?.trim().slice(0, 120);
  return clean ? clean : null;
}

export interface PageViewInput {
  path: string;
  sessionId: string;
  accountCode?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  country?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  /** True for the first view of a session — see is_entry in 0032. */
  isEntry?: boolean;
}

/**
 * Writes one view. Never throws: analytics failing is not a reason for a
 * page to fail, and the caller is a fire-and-forget beacon anyway.
 */
export async function recordPageView(input: PageViewInput): Promise<void> {
  const path = normalizePath(input.path);
  if (!path) return;
  if (isBot(input.userAgent)) return;

  const sessionId = input.sessionId?.trim().slice(0, 64);
  if (!sessionId) return;

  const host = referrerHost(input.referrer);
  const utmSource = utmValue(input.utmSource);
  const utmMedium = utmValue(input.utmMedium);

  try {
    await getSupabase()
      .from("page_views")
      .insert({
        path,
        session_id: sessionId,
        account_code: input.accountCode ?? null,
        referrer_host: host,
        device: deviceFrom(input.userAgent),
        country: input.country?.trim().slice(0, 2).toUpperCase() || null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmValue(input.utmCampaign),
        channel: classifyChannel({ referrerHost: host, utmSource, utmMedium, path }),
        is_entry: input.isEntry === true,
      });
  } catch (err) {
    console.error("Failed to record a page view:", err);
  }
}
