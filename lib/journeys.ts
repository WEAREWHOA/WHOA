import { channelById, type Channel } from "./channels";
import { getSupabase } from "./supabase";

/**
 * The journey map: how people arrive, where they land, where they go
 * next, and whether any of it ended in something.
 *
 * Built from sessions rather than views. A view is a fact about a page; a
 * journey is a fact about a person's visit, and almost every question
 * worth asking here ("does Instagram traffic ever reach the shop?") is a
 * question about the visit.
 *
 * Attribution is first-touch, taken from the session's entry view. The
 * alternative — crediting whatever page someone was on when they
 * converted — credits the checkout page for every sale.
 */

const SESSION_CAP = 40_000;

export interface OrbitChannel {
  id: string;
  label: string;
  group: Channel["group"];
  sessions: number;
  views: number;
  /** Sessions that reached more than one page. */
  engaged: number;
  /** Sessions that reached a page we count as an outcome. */
  converted: number;
  /** Where this channel most often lands. */
  topLanding: string | null;
}

export interface OrbitPage {
  path: string;
  views: number;
  sessions: number;
  /** Sessions whose first page this was. */
  entries: number;
}

export interface JourneyFlow {
  from: string;
  to: string;
  sessions: number;
}

export interface JourneyMap {
  periodDays: number;
  totalSessions: number;
  channels: OrbitChannel[];
  pages: OrbitPage[];
  /** channel id → landing path, for the outer ring's inbound arcs. */
  inbound: JourneyFlow[];
  /** page → next page, the most travelled steps inside the site. */
  steps: JourneyFlow[];
  truncated: boolean;
}

/**
 * Pages that mean something happened. Deliberately a short list of
 * endings rather than "anything past the homepage" — a journey map that
 * calls every second page view a conversion is a map of nothing.
 */
const OUTCOME_PAGES = [
  "/checkout",
  "/order-confirmed",
  "/go/scavenger",
  "/oasis/checkout",
];

function isOutcome(path: string): boolean {
  return OUTCOME_PAGES.includes(path) || path.startsWith("/checkin/");
}

interface ViewRow {
  path: string;
  session_id: string;
  channel: string | null;
  is_entry: boolean | null;
  created_at: string;
}

export async function getJourneyMap(periodDays = 30): Promise<JourneyMap> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString();

  let rows: ViewRow[] = [];
  try {
    const { data, error } = await getSupabase()
      .from("page_views")
      .select("path, session_id, channel, is_entry, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(SESSION_CAP);

    if (error) {
      console.error("Journey map: failed to read page_views:", error.message);
    } else {
      rows = (data ?? []) as ViewRow[];
    }
  } catch (err) {
    console.error("Journey map: failed to read page_views:", err);
  }

  // ── rebuild each session's ordered path ────────────────────────────
  const sessions = new Map<string, { channel: string; paths: string[] }>();
  for (const row of rows) {
    let session = sessions.get(row.session_id);
    if (!session) {
      session = { channel: row.channel ?? "direct", paths: [] };
      sessions.set(row.session_id, session);
    }
    // The entry view carries the attribution; later views inherit it.
    if (row.is_entry && row.channel) session.channel = row.channel;
    // Collapse an immediate repeat: a refresh is not a step in a journey.
    if (session.paths[session.paths.length - 1] !== row.path) session.paths.push(row.path);
  }

  const channelStats = new Map<string, OrbitChannel>();
  const pageViews = new Map<string, number>();
  const pageSessions = new Map<string, Set<string>>();
  const pageEntries = new Map<string, number>();
  const inbound = new Map<string, number>();
  const steps = new Map<string, number>();
  const landingByChannel = new Map<string, Map<string, number>>();

  for (const [sessionId, session] of sessions) {
    const meta = channelById(session.channel);
    let stats = channelStats.get(meta.id);
    if (!stats) {
      stats = {
        id: meta.id, label: meta.label, group: meta.group,
        sessions: 0, views: 0, engaged: 0, converted: 0, topLanding: null,
      };
      channelStats.set(meta.id, stats);
    }
    stats.sessions += 1;
    stats.views += session.paths.length;
    if (session.paths.length > 1) stats.engaged += 1;
    if (session.paths.some(isOutcome)) stats.converted += 1;

    const landing = session.paths[0];
    if (landing) {
      pageEntries.set(landing, (pageEntries.get(landing) ?? 0) + 1);
      inbound.set(`${meta.id}\u0000${landing}`, (inbound.get(`${meta.id}\u0000${landing}`) ?? 0) + 1);
      const byChannel = landingByChannel.get(meta.id) ?? new Map<string, number>();
      byChannel.set(landing, (byChannel.get(landing) ?? 0) + 1);
      landingByChannel.set(meta.id, byChannel);
    }

    for (let i = 0; i < session.paths.length; i += 1) {
      const path = session.paths[i];
      pageViews.set(path, (pageViews.get(path) ?? 0) + 1);
      const seen = pageSessions.get(path) ?? new Set<string>();
      seen.add(sessionId);
      pageSessions.set(path, seen);

      const next = session.paths[i + 1];
      if (next) {
        const key = `${path}\u0000${next}`;
        steps.set(key, (steps.get(key) ?? 0) + 1);
      }
    }
  }

  for (const [id, byLanding] of landingByChannel) {
    const top = [...byLanding.entries()].sort((a, b) => b[1] - a[1])[0];
    const stats = channelStats.get(id);
    if (stats && top) stats.topLanding = top[0];
  }

  const split = (key: string) => key.split("\u0000") as [string, string];

  return {
    periodDays,
    totalSessions: sessions.size,
    truncated: rows.length >= SESSION_CAP,
    channels: [...channelStats.values()].sort((a, b) => b.sessions - a.sessions),
    pages: [...pageViews.entries()]
      .map(([path, views]) => ({
        path,
        views,
        sessions: pageSessions.get(path)?.size ?? 0,
        entries: pageEntries.get(path) ?? 0,
      }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10),
    inbound: [...inbound.entries()]
      .map(([key, count]) => { const [from, to] = split(key); return { from, to, sessions: count }; })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 40),
    steps: [...steps.entries()]
      .map(([key, count]) => { const [from, to] = split(key); return { from, to, sessions: count }; })
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 40),
  };
}
