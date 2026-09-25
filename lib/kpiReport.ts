import { getSupabase } from "./supabase";

/**
 * Everything the ANALYTICS tab shows, queried from our own database.
 *
 * Named kpiReport rather than analytics because lib/analytics.ts is the
 * Google Analytics 4 client — that one is about sending events out, this
 * one is about reading our own rows back.
 *
 * One rule runs through this file: only report what the database can
 * actually support. Where a number is lifetime rather than period-scoped
 * (referral link clicks are a running counter, not timestamped rows) it
 * says so in its own `note`, because a lifetime total sitting in a "last
 * 30 days" grid is a lie the reader has no way to catch.
 *
 * Aggregation happens in JS rather than SQL views: the volumes here are
 * a small brand's, the queries stay readable, and adding a KPI doesn't
 * mean shipping a migration. ROW_CAP is the guard — if a window ever
 * exceeds it the snapshot says so rather than quietly reporting a
 * fraction of the traffic as the whole.
 */

const ROW_CAP = 50_000;

export interface Point {
  label: string;
  value: number;
}

export interface Kpi {
  id: string;
  label: string;
  value: string;
  /** Feeds the search box: plain words someone might type. */
  keywords: string;
  group: string;
  hint?: string;
  note?: string;
}

export interface FunnelStep {
  label: string;
  value: number;
}

export interface Funnel {
  id: string;
  title: string;
  blurb: string;
  steps: FunnelStep[];
}

export interface AnalyticsSnapshot {
  periodDays: number;
  generatedAt: string;
  truncated: boolean;
  kpis: Kpi[];
  viewsByDay: Point[];
  revenueByDay: Point[];
  stampsByDay: Point[];
  signupsByDay: Point[];
  topPages: Point[];
  entryPages: Point[];
  referrers: Point[];
  devices: Point[];
  countries: Point[];
  topProductsByRevenue: Point[];
  topProductsByUnits: Point[];
  ambassadorBoard: Point[];
  eventBoard: Point[];
  /** 7 rows (Mon–Sun) × 24 columns, in America/Los_Angeles. */
  heatmap: number[][];
  funnels: Funnel[];
}

function sinceIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

/**
 * Day and hour in Pacific time, not UTC.
 *
 * Everything here is read by people standing in San Diego. Bucketing on
 * toISOString would put anything after 4pm local into tomorrow, which
 * would quietly wreck both the daily series and the hour heatmap.
 */
const PT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

interface LocalParts {
  day: string;
  hour: number;
  weekday: number;
}

function localParts(iso: string | null | undefined): LocalParts | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const parts = PT.formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  const weekday = WEEKDAY_INDEX[get("weekday")] ?? 0;
  return { day, hour, weekday };
}

/** A zero-filled day axis, so a quiet day is a gap in the line, not a missing one. */
function dayAxis(days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const parts = localParts(new Date(Date.now() - i * 86_400_000).toISOString());
    if (parts) out.push(parts.day);
  }
  return out;
}

function series(days: number, counts: Map<string, number>): Point[] {
  return dayAxis(days).map((day) => ({ label: day, value: counts.get(day) ?? 0 }));
}

function topN(counts: Map<string, number>, n: number): Point[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

/** `newerThan` narrows server-side; everything else is filtered in JS. */
async function rows<T>(
  table: string,
  columns: string,
  newerThan?: { column: string; iso: string },
): Promise<T[]> {
  try {
    const base = getSupabase().from(table).select(columns).limit(ROW_CAP);
    const query = newerThan ? base.gte(newerThan.column, newerThan.iso) : base;
    const { data, error } = await query;
    if (error) {
      // A table that was never migrated shouldn't blank the whole tab —
      // that section just reports zero and everything else still works.
      console.error(`Analytics: failed to read ${table}:`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`Analytics: failed to read ${table}:`, err);
    return [];
  }
}

export async function getAnalytics(periodDays = 30): Promise<AnalyticsSnapshot> {
  const since = sinceIso(periodDays);

  const [
    views,
    orders,
    lineItems,
    rsvps,
    stamps,
    gamePrizes,
    waterPrizes,
    accounts,
    links,
    referralOrders,
    preorders,
    messages,
  ] = await Promise.all([
    rows<{ path: string; session_id: string; account_code: string | null; referrer_host: string | null; device: string; country: string | null; created_at: string }>(
      "page_views", "path, session_id, account_code, referrer_host, device, country, created_at",
      { column: "created_at", iso: since },
    ),
    rows<{ id: string; state: string | null; total_money_cents: number; created_at: string | null; closed_at: string | null }>(
      "square_orders", "id, state, total_money_cents, created_at, closed_at",
      { column: "created_at", iso: since },
    ),
    rows<{ order_id: string; name: string | null; quantity: number; total_money_cents: number }>(
      "square_order_line_items", "order_id, name, quantity, total_money_cents",
    ),
    rows<{ event_id: string; quantity: number; price_cents: number; checked_in_at: string | null; created_at: string }>(
      "event_rsvps", "event_id, quantity, price_cents, checked_in_at, created_at",
    ),
    rows<{ account_code: string; stamped_at: string }>(
      "scavenger_stamps", "account_code, stamped_at",
    ),
    rows<{ prize: string; reward: string; redeemed_at: string | null; claimed_at: string }>(
      "game_prize_claims", "prize, reward, redeemed_at, claimed_at",
    ),
    rows<{ redeemed_at: string | null; claimed_at: string }>(
      "water_prize_claims", "code, redeemed_at, claimed_at",
    ),
    rows<{ code: string; name: string; created_at: string; deleted_at: string | null }>(
      "ambassadors", "code, name, created_at, deleted_at",
    ),
    rows<{ ambassador_code: string; clicks: number }>("links", "ambassador_code, clicks"),
    rows<{ ambassador_code: string; sale_amount: number; commission: number; order_date: string }>(
      "orders", "ambassador_code, sale_amount, commission, order_date",
    ),
    rows<{ total_cents: number; status: string; created_at: string }>(
      "oasis_preorders", "total_cents, status, created_at",
    ),
    rows<{ created_at: string }>("contact_messages", "created_at"),
  ]);

  // ── traffic ────────────────────────────────────────────────────────
  const viewsByDayCounts = new Map<string, number>();
  const pageCounts = new Map<string, number>();
  const refCounts = new Map<string, number>();
  const deviceCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const sessionViews = new Map<string, number>();
  const sessionFirst = new Map<string, { path: string; at: number }>();
  const signedInSessions = new Set<string>();
  let signedInViews = 0;

  for (const view of views) {
    const parts = localParts(view.created_at);
    if (parts) {
      bump(viewsByDayCounts, parts.day);
      heatmap[parts.weekday][parts.hour] += 1;
    }
    bump(pageCounts, view.path);
    bump(deviceCounts, view.device || "unknown");
    if (view.referrer_host) bump(refCounts, view.referrer_host);
    if (view.country) bump(countryCounts, view.country);
    bump(sessionViews, view.session_id);
    if (view.account_code) {
      signedInViews += 1;
      signedInSessions.add(view.session_id);
    }
    const at = new Date(view.created_at).getTime();
    const seen = sessionFirst.get(view.session_id);
    if (!seen || at < seen.at) sessionFirst.set(view.session_id, { path: view.path, at });
  }

  const entryCounts = new Map<string, number>();
  for (const first of sessionFirst.values()) bump(entryCounts, first.path);

  const sessions = sessionViews.size;
  const singleViewSessions = [...sessionViews.values()].filter((n) => n === 1).length;
  const busiest = heatmap
    .flatMap((row, day) => row.map((value, hour) => ({ value, day, hour })))
    .sort((a, b) => b.value - a.value)[0];
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const goViews = pageCounts.get("/go") ?? 0;
  const waterViews = pageCounts.get("/water") ?? 0;

  // ── commerce ───────────────────────────────────────────────────────
  const paidOrders = orders.filter((o) => (o.state ?? "COMPLETED") !== "CANCELED");
  const revenueCents = paidOrders.reduce((sum, o) => sum + (o.total_money_cents ?? 0), 0);
  const revenueByDayCounts = new Map<string, number>();
  for (const order of paidOrders) {
    const parts = localParts(order.closed_at ?? order.created_at);
    if (parts) bump(revenueByDayCounts, parts.day, (order.total_money_cents ?? 0) / 100);
  }

  const orderIds = new Set(paidOrders.map((o) => o.id));
  const periodItems = lineItems.filter((li) => orderIds.has(li.order_id));
  const productRevenue = new Map<string, number>();
  const productUnits = new Map<string, number>();
  let unitsSold = 0;
  for (const item of periodItems) {
    const name = item.name?.trim() || "Unnamed item";
    bump(productRevenue, name, (item.total_money_cents ?? 0) / 100);
    const qty = Number(item.quantity) || 0;
    bump(productUnits, name, qty);
    unitsSold += qty;
  }

  // ── events ─────────────────────────────────────────────────────────
  const periodRsvps = rsvps.filter((r) => r.created_at >= since);
  const ticketsSold = periodRsvps.reduce((sum, r) => sum + (r.quantity || 1), 0);
  const ticketRevenue = periodRsvps.reduce(
    (sum, r) => sum + (r.price_cents ?? 0) * (r.quantity || 1), 0,
  );
  const checkedIn = rsvps
    .filter((r) => r.checked_in_at)
    .reduce((sum, r) => sum + (r.quantity || 1), 0);
  const allTickets = rsvps.reduce((sum, r) => sum + (r.quantity || 1), 0);
  const eventCounts = new Map<string, number>();
  for (const rsvp of periodRsvps) bump(eventCounts, rsvp.event_id, rsvp.quantity || 1);

  // ── SSBD scavenger ─────────────────────────────────────────────────
  const stampsByAccount = new Map<string, number>();
  const stampsByDayCounts = new Map<string, number>();
  for (const stamp of stamps) {
    bump(stampsByAccount, stamp.account_code);
    const parts = localParts(stamp.stamped_at);
    if (parts) bump(stampsByDayCounts, parts.day);
  }
  const cardsStarted = stampsByAccount.size;
  const cardsComplete = [...stampsByAccount.values()].filter((n) => n >= 6).length;

  // ── prizes ─────────────────────────────────────────────────────────
  const scavengerPrizes = gamePrizes.filter((p) => p.prize === "scavenger");
  const snakePrizes = gamePrizes.filter((p) => p.prize === "snake");
  const stickerPicks = gamePrizes.filter((p) => p.reward === "FREE STICKER").length;
  const waterPicks = gamePrizes.filter((p) => p.reward === "H2WHOA WATER").length;
  const prizesOutstanding =
    gamePrizes.filter((p) => !p.redeemed_at).length + waterPrizes.filter((p) => !p.redeemed_at).length;
  const prizesRedeemed =
    gamePrizes.filter((p) => p.redeemed_at).length + waterPrizes.filter((p) => p.redeemed_at).length;

  // ── ambassadors ────────────────────────────────────────────────────
  const clicksByAmbassador = new Map<string, number>();
  let totalClicks = 0;
  for (const link of links) {
    bump(clicksByAmbassador, link.ambassador_code, link.clicks ?? 0);
    totalClicks += link.clicks ?? 0;
  }
  const periodReferralOrders = referralOrders.filter((o) => o.order_date >= since);
  const attributedSales = periodReferralOrders.reduce((s, o) => s + Number(o.sale_amount || 0), 0);
  const commissionOwed = periodReferralOrders.reduce((s, o) => s + Number(o.commission || 0), 0);
  const salesByAmbassador = new Map<string, number>();
  for (const order of periodReferralOrders) {
    bump(salesByAmbassador, order.ambassador_code, Number(order.sale_amount || 0));
  }
  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]));

  // ── community ──────────────────────────────────────────────────────
  const liveAccounts = accounts.filter((a) => !a.deleted_at);
  const newAccounts = liveAccounts.filter((a) => a.created_at >= since);
  const signupsByDayCounts = new Map<string, number>();
  for (const account of newAccounts) {
    const parts = localParts(account.created_at);
    if (parts) bump(signupsByDayCounts, parts.day);
  }
  const periodPreorders = preorders.filter((p) => p.created_at >= since);
  const preorderValue = periodPreorders.reduce((s, p) => s + (p.total_cents ?? 0), 0);
  const periodMessages = messages.filter((m) => m.created_at >= since);

  const kpis: Kpi[] = [
    // Traffic
    { id: "views", group: "Traffic", label: "Page views", value: views.length.toLocaleString(), keywords: "traffic pageviews hits visits" },
    { id: "sessions", group: "Traffic", label: "Sessions", value: sessions.toLocaleString(), keywords: "visits visitors traffic unique" },
    { id: "perSession", group: "Traffic", label: "Pages per session", value: sessions ? (views.length / sessions).toFixed(1) : "—", keywords: "depth engagement traffic" },
    { id: "bounce", group: "Traffic", label: "Single-page sessions", value: pct(singleViewSessions, sessions), keywords: "bounce rate leave exit traffic", hint: "Sessions that saw one page and left." },
    { id: "signedInViews", group: "Traffic", label: "Signed-in views", value: pct(signedInViews, views.length), keywords: "logged in accounts traffic share" },
    { id: "goScans", group: "Traffic", label: "/go landings", value: goViews.toLocaleString(), keywords: "qr scan flyer ssbd scavenger traffic" },
    { id: "waterScans", group: "Traffic", label: "/water landings", value: waterViews.toLocaleString(), keywords: "qr scan bottle h2whoa traffic" },
    { id: "busiest", group: "Traffic", label: "Busiest hour", value: busiest?.value ? `${DAY_NAMES[busiest.day]} ${String(busiest.hour).padStart(2, "0")}:00` : "—", keywords: "peak time busy hour traffic when" },
    { id: "topPage", group: "Traffic", label: "Top page", value: topN(pageCounts, 1)[0]?.label ?? "—", keywords: "popular page traffic best" },
    { id: "topReferrer", group: "Traffic", label: "Top referrer", value: topN(refCounts, 1)[0]?.label ?? "Direct", keywords: "source referral instagram traffic where from" },
    { id: "mobileShare", group: "Traffic", label: "Mobile share", value: pct(deviceCounts.get("mobile") ?? 0, views.length), keywords: "device phone mobile traffic" },
    { id: "countries", group: "Traffic", label: "Countries", value: countryCounts.size.toLocaleString(), keywords: "geography country location traffic" },

    // Commerce
    { id: "revenue", group: "Commerce", label: "Revenue", value: money(revenueCents), keywords: "sales money income shop square gross" },
    { id: "orders", group: "Commerce", label: "Orders", value: paidOrders.length.toLocaleString(), keywords: "sales purchases transactions shop" },
    { id: "aov", group: "Commerce", label: "Average order value", value: paidOrders.length ? money(Math.round(revenueCents / paidOrders.length)) : "—", keywords: "aov basket average sales" },
    { id: "units", group: "Commerce", label: "Units sold", value: unitsSold.toLocaleString(), keywords: "items products quantity sales" },
    { id: "topProduct", group: "Commerce", label: "Best seller", value: topN(productUnits, 1)[0]?.label ?? "—", keywords: "product best seller top item" },
    { id: "conversion", group: "Commerce", label: "Shop conversion", value: pct(paidOrders.length, entryCounts.size || sessions), keywords: "conversion rate funnel sales", hint: "Orders as a share of sessions. Counts orders from every channel, including the POS." },

    // Ambassadors
    { id: "referralClicks", group: "Ambassadors", label: "Referral link clicks", value: totalClicks.toLocaleString(), keywords: "ambassador referral link clicks", note: "Lifetime — link clicks are a running counter, not dated rows." },
    { id: "attributed", group: "Ambassadors", label: "Attributed sales", value: `$${attributedSales.toFixed(2)}`, keywords: "ambassador referral sales attribution" },
    { id: "commission", group: "Ambassadors", label: "Commission owed", value: `$${commissionOwed.toFixed(2)}`, keywords: "ambassador payout commission owed" },
    { id: "activeAmbassadors", group: "Ambassadors", label: "Ambassadors with a sale", value: salesByAmbassador.size.toLocaleString(), keywords: "ambassador active selling" },

    // Events
    { id: "tickets", group: "Events", label: "Tickets sold", value: ticketsSold.toLocaleString(), keywords: "events tickets rsvp sales" },
    { id: "ticketRevenue", group: "Events", label: "Ticket revenue", value: money(ticketRevenue), keywords: "events tickets money revenue" },
    { id: "rsvps", group: "Events", label: "RSVPs", value: periodRsvps.length.toLocaleString(), keywords: "events rsvp bookings" },
    { id: "checkedIn", group: "Events", label: "Checked in", value: checkedIn.toLocaleString(), keywords: "events door checkin attendance", note: "All time — check-ins aren't restricted to the period." },
    { id: "checkinRate", group: "Events", label: "Check-in rate", value: pct(checkedIn, allTickets), keywords: "events attendance showed up door", note: "All time." },

    // SSBD
    { id: "stamps", group: "SSBD", label: "Stamps earned", value: stamps.length.toLocaleString(), keywords: "scavenger stamps ssbd go card", note: "All time." },
    { id: "cardsStarted", group: "SSBD", label: "Cards started", value: cardsStarted.toLocaleString(), keywords: "scavenger cards players ssbd", note: "All time." },
    { id: "cardsComplete", group: "SSBD", label: "Cards completed", value: cardsComplete.toLocaleString(), keywords: "scavenger complete six ssbd", note: "All time." },
    { id: "cardRate", group: "SSBD", label: "Card completion rate", value: pct(cardsComplete, cardsStarted), keywords: "scavenger completion rate ssbd" },

    // Prizes
    { id: "prizeScavenger", group: "Prizes", label: "Scavenger prizes", value: scavengerPrizes.length.toLocaleString(), keywords: "prizes scavenger claimed reward" },
    { id: "prizeSnake", group: "Prizes", label: "Snake prizes", value: snakePrizes.length.toLocaleString(), keywords: "prizes snake game sticker reward" },
    { id: "prizeWater", group: "Prizes", label: "H2WHOA bottle prizes", value: waterPrizes.length.toLocaleString(), keywords: "prizes water bottle spin reward" },
    { id: "prizeSticker", group: "Prizes", label: "Chose a sticker", value: stickerPicks.toLocaleString(), keywords: "prizes sticker choice reward" },
    { id: "prizeWaterPick", group: "Prizes", label: "Chose a water", value: waterPicks.toLocaleString(), keywords: "prizes water choice reward" },
    { id: "prizeOutstanding", group: "Prizes", label: "Not yet collected", value: prizesOutstanding.toLocaleString(), keywords: "prizes outstanding unredeemed owed" },
    { id: "prizeRedeemed", group: "Prizes", label: "Handed over", value: prizesRedeemed.toLocaleString(), keywords: "prizes redeemed collected" },

    // Community
    { id: "newAccounts", group: "Community", label: "New accounts", value: newAccounts.length.toLocaleString(), keywords: "signups accounts members growth" },
    { id: "totalAccounts", group: "Community", label: "Total accounts", value: liveAccounts.length.toLocaleString(), keywords: "accounts members community size", note: "All time." },
    { id: "preorders", group: "Community", label: "Oasis pre-orders", value: periodPreorders.length.toLocaleString(), keywords: "oasis catalogue preorder" },
    { id: "preorderValue", group: "Community", label: "Pre-order value", value: money(preorderValue), keywords: "oasis catalogue preorder money" },
    { id: "messages", group: "Community", label: "Contact messages", value: periodMessages.length.toLocaleString(), keywords: "contact messages enquiries email" },
  ];

  const funnels: Funnel[] = [
    {
      id: "ssbd",
      title: "SSBD scavenger",
      blurb: "Flyer scan through to a prize in someone's hand.",
      steps: [
        { label: "/go landings", value: goViews },
        { label: "Signed in", value: signedInSessions.size },
        { label: "Started a card", value: cardsStarted },
        { label: "Filled all six", value: cardsComplete },
        { label: "Claimed a prize", value: scavengerPrizes.length },
        { label: "Collected it", value: scavengerPrizes.filter((p) => p.redeemed_at).length },
      ],
    },
    {
      id: "shop",
      title: "Shop",
      blurb: "Browsing through to a paid order.",
      steps: [
        { label: "Shop views", value: pageCounts.get("/shop") ?? 0 },
        {
          label: "Product views",
          value: [...pageCounts.entries()]
            .filter(([path]) => path.startsWith("/shop/"))
            .reduce((sum, [, n]) => sum + n, 0),
        },
        { label: "Reached checkout", value: pageCounts.get("/checkout") ?? 0 },
        { label: "Orders placed", value: paidOrders.length },
      ],
    },
    {
      id: "water",
      title: "H2WHOA bottle",
      blurb: "Bottle scan through to a claimed sticker.",
      steps: [
        { label: "/water landings", value: waterViews },
        { label: "Claimed a prize", value: waterPrizes.length },
        { label: "Collected it", value: waterPrizes.filter((p) => p.redeemed_at).length },
      ],
    },
    {
      id: "events",
      title: "Events",
      blurb: "Event page through to someone at the door.",
      steps: [
        { label: "Events views", value: pageCounts.get("/events") ?? 0 },
        { label: "RSVPs", value: periodRsvps.length },
        { label: "Tickets sold", value: ticketsSold },
        { label: "Checked in", value: checkedIn },
      ],
    },
  ];

  return {
    periodDays,
    generatedAt: new Date().toISOString(),
    truncated: views.length >= ROW_CAP,
    kpis,
    viewsByDay: series(periodDays, viewsByDayCounts),
    revenueByDay: series(periodDays, revenueByDayCounts),
    stampsByDay: series(periodDays, stampsByDayCounts),
    signupsByDay: series(periodDays, signupsByDayCounts),
    topPages: topN(pageCounts, 12),
    entryPages: topN(entryCounts, 8),
    referrers: topN(refCounts, 8),
    devices: topN(deviceCounts, 5),
    countries: topN(countryCounts, 8),
    topProductsByRevenue: topN(productRevenue, 8),
    topProductsByUnits: topN(productUnits, 8),
    ambassadorBoard: topN(salesByAmbassador, 8).map((p) => ({
      label: nameByCode.get(p.label) ?? p.label,
      value: p.value,
    })),
    eventBoard: topN(eventCounts, 8),
    heatmap,
    funnels,
  };
}
