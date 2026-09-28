import { isOutcome } from "./journeys";
import { getSupabase } from "./supabase";
import { normalizeLinkPath, slugifyTag, tagKey } from "./utmLinks";

/**
 * The saved UTM link library, and how each link is actually doing.
 *
 * Server-only (service-role Supabase). The pure rules — presets, slugs,
 * URL building — are in lib/utmLinks.ts so the builder can run them in
 * the browser.
 */

export interface UtmLink {
  id: string;
  label: string | null;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  content: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface UtmLinkInput {
  label?: string;
  path: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}

interface Row {
  id: string;
  label: string | null;
  path: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  created_by: string | null;
  created_at: string;
}

function mapRow(row: Row): UtmLink {
  return {
    id: row.id,
    label: row.label,
    path: row.path,
    source: row.utm_source,
    medium: row.utm_medium,
    campaign: row.utm_campaign,
    content: row.utm_content,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Cleans an input the same way the builder does. Re-done here because a
 * server action is a public endpoint: the tags that reach the table must
 * be slugged whatever the client sent. Null if a required tag is empty.
 */
export function cleanLinkInput(input: UtmLinkInput) {
  const source = slugifyTag(input.source);
  const medium = slugifyTag(input.medium);
  const campaign = slugifyTag(input.campaign);
  if (!source || !medium || !campaign) return null;
  return {
    label: input.label?.trim().slice(0, 120) || null,
    path: normalizeLinkPath(input.path),
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: slugifyTag(input.content ?? "") || null,
  };
}

/** The whole library, newest first. Null if the table isn't there yet (0034 not applied). */
export async function listUtmLinks(): Promise<UtmLink[] | null> {
  const { data, error } = await getSupabase()
    .from("utm_links")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) {
    console.error("Failed to load UTM links:", error.message);
    return null;
  }
  return (data ?? []).map((row) => mapRow(row as Row));
}

/** Saves links, skipping any already in the library. Returns how many were new. */
export async function saveUtmLinks(inputs: UtmLinkInput[], byCode: string): Promise<number> {
  const rows = inputs
    .map(cleanLinkInput)
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .map((row) => ({ ...row, created_by: byCode.trim().toUpperCase() }));
  if (rows.length === 0) return 0;

  const { data, error } = await getSupabase()
    .from("utm_links")
    .upsert(rows, {
      onConflict: "path,utm_source,utm_medium,utm_campaign,utm_content",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw new Error(`Failed to save those links: ${error.message}`);
  return data?.length ?? 0;
}

export async function deleteUtmLink(id: string): Promise<void> {
  const { error } = await getSupabase().from("utm_links").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete that link: ${error.message}`);
}

// ── performance ──────────────────────────────────────────────────────

export interface TagStats {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  /** Visits that began on a link with these tags. */
  sessions: number;
  /** Of those, visits that went past the first page. */
  engaged: number;
  /** Of those, visits that reached an outcome page (checkout, check-in…). */
  converted: number;
  lastSeen: string;
}

export interface UtmPerformance {
  periodDays: number;
  /** Keyed by tagKey(source, medium, campaign, content). */
  byTags: Record<string, TagStats>;
  /** Hit the read cap, so counts are a floor rather than exact. */
  truncated: boolean;
}

const PAGE = 1000;
const ENTRY_CAP = 20_000;
const SESSION_CHUNK = 200;

/**
 * Tagged visits over the period, grouped by their exact tags.
 *
 * Two reads rather than one scan of every view: first the entry views
 * that carried tags (a small slice of traffic), then only those sessions'
 * other views, to see whether the visit went anywhere. Read in pages,
 * since the API returns at most a thousand rows per request.
 */
export async function getUtmPerformance(periodDays = 90): Promise<UtmPerformance> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();
  const supabase = getSupabase();
  const byTags: Record<string, TagStats> = {};
  const sessionKey = new Map<string, string>();
  let truncated = false;

  try {
    // Until 0035 is run there's no utm_content to read; fall back to
    // reading without it rather than showing no stats at all.
    let columns = "session_id, utm_source, utm_medium, utm_campaign, utm_content, created_at";
    const entries = (from: number) =>
      supabase
        .from("page_views")
        .select(columns)
        .eq("is_entry", true)
        .not("utm_source", "is", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

    for (let from = 0; from < ENTRY_CAP; from += PAGE) {
      let { data, error } = await entries(from);
      if (error && from === 0 && error.message.includes("utm_content")) {
        columns = "session_id, utm_source, utm_medium, utm_campaign, created_at";
        ({ data, error } = await entries(from));
      }
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as Array<{
        session_id: string;
        utm_source: string | null;
        utm_medium: string | null;
        utm_campaign: string | null;
        utm_content?: string | null;
        created_at: string;
      }>;

      for (const row of rows) {
        // An entry can be sent twice when storage can't be marked (see
        // PageViewTracker); the first one seen wins.
        if (sessionKey.has(row.session_id)) continue;
        const key = tagKey(row.utm_source, row.utm_medium, row.utm_campaign, row.utm_content);
        sessionKey.set(row.session_id, key);
        const stats = (byTags[key] ??= {
          source: (row.utm_source ?? "").toLowerCase(),
          medium: (row.utm_medium ?? "").toLowerCase(),
          campaign: (row.utm_campaign ?? "").toLowerCase(),
          content: (row.utm_content ?? "").toLowerCase(),
          sessions: 0,
          engaged: 0,
          converted: 0,
          lastSeen: row.created_at,
        });
        stats.sessions += 1;
        if (row.created_at > stats.lastSeen) stats.lastSeen = row.created_at;
      }

      if (rows.length < PAGE) break;
      if (from + PAGE >= ENTRY_CAP) truncated = true;
    }

    // What each tagged visit went on to do.
    const sessionIds = [...sessionKey.keys()];
    const paths = new Map<string, Set<string>>();
    for (let i = 0; i < sessionIds.length; i += SESSION_CHUNK) {
      const chunk = sessionIds.slice(i, i + SESSION_CHUNK);
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("page_views")
          .select("session_id, path")
          .in("session_id", chunk)
          .range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as Array<{ session_id: string; path: string }>;
        for (const row of rows) {
          const seen = paths.get(row.session_id) ?? new Set<string>();
          seen.add(row.path);
          paths.set(row.session_id, seen);
        }
        if (rows.length < PAGE) break;
      }
    }

    for (const [sessionId, key] of sessionKey) {
      const stats = byTags[key];
      const visited = paths.get(sessionId);
      if (!stats || !visited) continue;
      if (visited.size > 1) stats.engaged += 1;
      if ([...visited].some(isOutcome)) stats.converted += 1;
    }
  } catch (err) {
    // Stats failing must not take the builder down with them.
    console.error("UTM performance: failed to read page_views:", err);
  }

  return { periodDays, byTags, truncated };
}
