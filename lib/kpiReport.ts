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
 * mean shipping a migration. ROW_CAP is the guard: if a window ever
 * exceeds it the snapshot says so rather than quietly reporting a
 * fraction of the traffic as the whole.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Why every read here is paged.
 *
 * `.limit(50000)` does NOT get you 50,000 rows. PostgREST enforces its
 * own ceiling, `db-max-rows`, and Supabase ships it set to 1,000. A
 * client-side limit above it is silently clamped: no error, no warning,
 * just the first thousand rows presented as the whole table.
 *
 * That is exactly what this file did, and it is why page views appeared
 * to stop at 1,000. Worse, it was not only traffic. Orders, line items,
 * RSVPs, stamps and accounts all read through the same helper, so once
 * any of them passed a thousand rows in the window, every number built
 * on it was wrong and nothing said so. `truncated` was meant to catch
 * precisely this and could not: it compared against 50,000, a number the
 * query could never reach.
 *
 * So each read walks the table in pages, and every page is ordered by the
 * primary key. The order is not cosmetic. Postgres makes no promise about
 * row order between two unordered queries, so paging without a stable
 * sort can hand you the same row twice and skip another, which in an
 * analytics table means a count that is wrong in both directions at once.
 * ───────────────────────────────────────────────────────────────────────
 */

const ROW_CAP = 50_000;

/**
 * Rows per request. Must stay at or below the smallest `db-max-rows` this
 * runs against, which is Supabase's default of 1,000. Asking for more
 * would be clamped back to it and the short page would end the walk
 * early, which is the bug this page size exists to avoid.
 */
const PAGE_SIZE = 1_000;

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
  onlineRevenueByDay: Point[];
  abandonedByDay: Point[];
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

/**
 * Every row in a table, or in a time window of it, read a page at a time.
 *
 * `newerThan` narrows server-side; everything else is filtered in JS.
 * `key` is the column paging is ordered by and must be unique, which in
 * practice means the primary key. See the note at the top of the file for
 * why that is not optional.
 *
 * Stops at ROW_CAP. Reaching it is reported through `hitCap` rather than
 * being silently absorbed, because a truncated analytics table that looks
 * complete is the failure mode this whole helper exists to prevent.
 */
interface PagedRows<T> {
  rows: T[];
  hitCap: boolean;
}

async function page<T>(
  table: string,
  columns: string,
  key: string,
  newerThan?: { column: string; iso: string },
): Promise<PagedRows<T>> {
  const out: T[] = [];
  try {
    for (let from = 0; from < ROW_CAP; from += PAGE_SIZE) {
      const to = Math.min(from + PAGE_SIZE, ROW_CAP) - 1;
      let query = getSupabase()
        .from(table)
        .select(columns)
        .order(key, { ascending: true })
        .range(from, to);
      if (newerThan) query = query.gte(newerThan.column, newerThan.iso);

      const { data, error } = await query;
      if (error) {
        // A table that was never migrated shouldn't blank the whole tab:
        // that section reports zero and everything else still works. Rows
        // already collected are kept, since a partial read of a real table
        // beats discarding it over one bad page.
        console.error(`Analytics: failed to read ${table}:`, error.message);
        return { rows: out, hitCap: false };
      }

      const batch = (data ?? []) as T[];
      out.push(...batch);
      // A short page is the end of the table. This is the one inference
      // the walk makes, and it is why PAGE_SIZE must not exceed the
      // server's own ceiling: a clamped page would look short.
      if (batch.length < to - from + 1) return { rows: out, hitCap: false };
    }
    return { rows: out, hitCap: true };
  } catch (err) {
    console.error(`Analytics: failed to read ${table}:`, err);
    return { rows: out, hitCap: false };
  }
}

/**
 * The same walk, narrowed to rows whose `column` is one of `values`.
 *
 * For a child table with no timestamp of its own. square_order_line_items
 * is the case: it has no created_at, which is why it was being read in
 * full on every dashboard load and then filtered down in JS. On a history
 * of fifteen thousand orders that is tens of thousands of rows fetched to
 * use a few hundred, and it walks towards ROW_CAP, past which the product
 * figures would quietly start undercounting.
 *
 * The id list is chunked because this ends up in a URL, and a few hundred
 * order ids in one `in` clause is a request line long enough for a proxy
 * to refuse. Each chunk is then paged exactly like any other read, since
 * a chunk can still hold more rows than the server will return at once.
 */
const IN_CHUNK = 100;

async function pageWhereIn<T>(
  table: string,
  columns: string,
  key: string,
  column: string,
  values: string[],
): Promise<PagedRows<T>> {
  const out: T[] = [];
  if (values.length === 0) return { rows: out, hitCap: false };

  try {
    for (let i = 0; i < values.length; i += IN_CHUNK) {
      const slice = values.slice(i, i + IN_CHUNK);

      for (let from = 0; from < ROW_CAP; from += PAGE_SIZE) {
        if (out.length >= ROW_CAP) return { rows: out, hitCap: true };
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await getSupabase()
          .from(table)
          .select(columns)
          .in(column, slice)
          .order(key, { ascending: true })
          .range(from, to);

        if (error) {
          console.error(`Analytics: failed to read ${table}:`, error.message);
          return { rows: out, hitCap: false };
        }

        const batch = (data ?? []) as T[];
        out.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
    }
    return { rows: out, hitCap: false };
  } catch (err) {
    console.error(`Analytics: failed to read ${table}:`, err);
    return { rows: out, hitCap: false };
  }
}

export async function getAnalytics(periodDays = 30): Promise<AnalyticsSnapshot> {
  const since = sinceIso(periodDays);

  const [
    viewsPage,
    ordersPage,
    rsvpsPage,
    stampsPage,
    gamePrizesPage,
    waterPrizesPage,
    accountsPage,
    linksPage,
    referralOrdersPage,
    preordersPage,
    messagesPage,
    cartsPage,
    subscribersPage,
    reviewRequestsPage,
    reviewsPage,
  ] = await Promise.all([
    page<{ path: string; session_id: string; account_code: string | null; referrer_host: string | null; device: string; country: string | null; created_at: string }>(
      "page_views", "id, path, session_id, account_code, referrer_host, device, country, created_at", "id",
      { column: "created_at", iso: since },
    ),
    page<{ id: string; state: string | null; total_money_cents: number; created_at: string | null; closed_at: string | null; channel: string | null }>(
      "square_orders", "id, state, total_money_cents, created_at, closed_at, channel", "id",
      { column: "created_at", iso: since },
    ),
    page<{ event_id: string; quantity: number; price_cents: number; checked_in_at: string | null; created_at: string }>(
      "event_rsvps", "id, event_id, quantity, price_cents, checked_in_at, created_at", "id",
    ),
    page<{ account_code: string; stamped_at: string }>(
      "scavenger_stamps", "id, account_code, stamped_at", "id",
    ),
    page<{ prize: string; reward: string; redeemed_at: string | null; claimed_at: string }>(
      "game_prize_claims", "id, prize, reward, redeemed_at, claimed_at", "id",
    ),
    page<{ redeemed_at: string | null; claimed_at: string }>(
      "water_prize_claims", "id, code, redeemed_at, claimed_at", "id",
    ),
    page<{ code: string; name: string; created_at: string; deleted_at: string | null }>(
      "ambassadors", "code, name, created_at, deleted_at", "code",
    ),
    page<{ ambassador_code: string; clicks: number }>("links", "id, ambassador_code, clicks", "id"),
    page<{ ambassador_code: string; sale_amount: number; commission: number; order_date: string }>(
      "orders", "id, ambassador_code, sale_amount, commission, order_date", "id",
    ),
    page<{ total_cents: number; status: string; created_at: string }>(
      "oasis_preorders", "id, total_cents, status, created_at", "id",
    ),
    page<{ created_at: string }>("contact_messages", "id, created_at", "id"),
    // Abandoned checkouts: one row per email, so a row IS a person who got
    // far enough to type their address and then did not buy.
    page<{ email: string; subtotal_cents: number; lines: unknown; recovered_at: string | null; reminder_email_id: string | null; created_at: string; updated_at: string }>(
      "abandoned_checkouts",
      "email, subtotal_cents, lines, recovered_at, reminder_email_id, created_at, updated_at",
      "email",
      { column: "created_at", iso: since },
    ),
    page<{ email: string; status: string | null; source: string | null; optin_recorded: boolean | null; created_at: string }>(
      "newsletter_subscribers", "email, status, source, optin_recorded, created_at", "email",
    ),
    page<{ order_id: string; email: string; status: string | null; scheduled_for: string; created_at: string }>(
      "review_requests", "order_id, email, status, scheduled_for, created_at", "order_id",
      { column: "created_at", iso: since },
    ),
    page<{ rating: number; status: string | null; verified_purchase: boolean | null; reply_at: string | null; created_at: string }>(
      "product_reviews", "id, rating, status, verified_purchase, reply_at, created_at", "id",
      { column: "created_at", iso: since },
    ),
  ]);

  // The walk reports whether it stopped at ROW_CAP rather than at the end
  // of the table. Any one of them hitting it makes the whole snapshot a
  // sample, so the tab says so instead of presenting a fraction as a total.
  const reads = [
    viewsPage,
    ordersPage,
    rsvpsPage,
    stampsPage,
    gamePrizesPage,
    waterPrizesPage,
    accountsPage,
    linksPage,
    referralOrdersPage,
    preordersPage,
    messagesPage,
    cartsPage,
    subscribersPage,
    reviewRequestsPage,
    reviewsPage,
  ];
  let truncated = reads.some((r) => r.hitCap);

  const views = viewsPage.rows;
  const orders = ordersPage.rows;
  const rsvps = rsvpsPage.rows;
  const stamps = stampsPage.rows;
  const gamePrizes = gamePrizesPage.rows;
  const waterPrizes = waterPrizesPage.rows;
  const accounts = accountsPage.rows;
  const links = linksPage.rows;
  const referralOrders = referralOrdersPage.rows;
  const preorders = preordersPage.rows;
  const messages = messagesPage.rows;
  const carts = cartsPage.rows;
  const subscribers = subscribersPage.rows;
  const reviewRequests = reviewRequestsPage.rows;
  const reviews = reviewsPage.rows;


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

  // Fetched for THESE orders rather than fetched whole and filtered after.
  // The table has no timestamp to narrow on, so the order ids are the
  // filter, and they are already known by this point. On a long history
  // this is the difference between reading a few hundred rows and reading
  // every line item the shop has ever sold.
  const orderIds = paidOrders.map((o) => o.id);
  const lineItemsPage = await pageWhereIn<{
    order_id: string;
    name: string | null;
    quantity: number;
    total_money_cents: number;
  }>("square_order_line_items", "id, order_id, name, quantity, total_money_cents", "id", "order_id", orderIds);
  const periodItems = lineItemsPage.rows;
  if (lineItemsPage.hitCap) truncated = true;
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

  // ── channel split ──────────────────────────────────────────────────
  // Null channel is NOT in_person. It means the row predates 0044 or was
  // written while that migration was outstanding, and counting it either
  // way would invent a split. Reported as its own number so a
  // half-backfilled table is visible rather than quietly wrong.
  const onlineOrders = paidOrders.filter((o) => o.channel === "online");
  const inPersonOrders = paidOrders.filter((o) => o.channel === "in_person");
  const unclassifiedOrders = paidOrders.filter((o) => !o.channel);
  const sumCents = (list: typeof paidOrders) =>
    list.reduce((sum, o) => sum + (o.total_money_cents ?? 0), 0);
  const onlineCents = sumCents(onlineOrders);
  const inPersonCents = sumCents(inPersonOrders);
  const onlineByDayCounts = new Map<string, number>();
  for (const order of onlineOrders) {
    const parts = localParts(order.closed_at ?? order.created_at);
    if (parts) bump(onlineByDayCounts, parts.day, (order.total_money_cents ?? 0) / 100);
  }

  // ── abandoned checkouts ────────────────────────────────────────────
  // A row is one person who typed their email at checkout and did not
  // finish. `recovered_at` is set the moment their order completes, so a
  // recovered row is a sale this reminder can take credit for.
  const recoveredCarts = carts.filter((c) => c.recovered_at);
  const openCarts = carts.filter((c) => !c.recovered_at);
  const abandonedValue = openCarts.reduce((sum, c) => sum + (c.subtotal_cents ?? 0), 0);
  const recoveredValue = recoveredCarts.reduce((sum, c) => sum + (c.subtotal_cents ?? 0), 0);
  const remindersSent = carts.filter((c) => c.reminder_email_id).length;
  const abandonedByDayCounts = new Map<string, number>();
  for (const cart of carts) {
    const parts = localParts(cart.created_at);
    if (parts) bump(abandonedByDayCounts, parts.day);
  }
  // Checkouts started is carts plus orders, because a cart that converted
  // is marked recovered and a cart that never got an email typed in is
  // not in this table at all. An approximation, and labelled as one.
  const checkoutsStarted = openCarts.length + paidOrders.length;

  // ── email and SMS list ─────────────────────────────────────────────
  const mailable = subscribers.filter((c) => (c.status ?? "subscribed") === "subscribed");
  const heldNotMailable = subscribers.filter((c) => c.status === "never");
  const unsubscribed = subscribers.filter((c) => c.status === "unsubscribed");
  const newSubscribers = mailable.filter((c) => c.created_at >= since);

  // ── reviews ────────────────────────────────────────────────────────
  const publishedReviews = reviews.filter((r) => r.status === "approved");
  const pendingReviews = reviews.filter((r) => (r.status ?? "pending") === "pending");
  const ratingSum = publishedReviews.reduce((sum, r) => sum + (r.rating ?? 0), 0);
  const averageRating = publishedReviews.length ? ratingSum / publishedReviews.length : 0;

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

    // Online vs in person
    { id: "onlineRevenue", group: "Online", label: "Online sales", value: money(onlineCents), keywords: "online web storefront shipped revenue sales ecommerce", hint: "Orders Square shipped or delivered, which is what the storefront creates." },
    { id: "onlineOrders", group: "Online", label: "Online orders", value: onlineOrders.length.toLocaleString(), keywords: "online web storefront orders count ecommerce" },
    { id: "onlineAov", group: "Online", label: "Online average order", value: onlineOrders.length ? money(Math.round(onlineCents / onlineOrders.length)) : "—", keywords: "online aov basket average web" },
    { id: "onlineShare", group: "Online", label: "Online share of revenue", value: pct(onlineCents, onlineCents + inPersonCents), keywords: "online share split channel mix web vs store" },
    { id: "onlineConversion", group: "Online", label: "Online conversion", value: pct(onlineOrders.length, sessions), keywords: "online conversion rate web sessions", hint: "Online orders as a share of sessions. The honest one: the overall figure above includes till sales that never saw the site." },
    { id: "inPersonRevenue", group: "Online", label: "In-person sales", value: money(inPersonCents), keywords: "pos register store popup in person revenue sales till" },
    { id: "inPersonOrders", group: "Online", label: "In-person orders", value: inPersonOrders.length.toLocaleString(), keywords: "pos register store popup orders till" },
    { id: "unclassifiedOrders", group: "Online", label: "Channel not recorded", value: unclassifiedOrders.length.toLocaleString(), keywords: "unknown channel backfill missing split", hint: "Orders stored before the channel column existed. Re-run the Square order backfill to classify them.", note: unclassifiedOrders.length > 0 ? "Not counted as online or in person, so the split above is of the rest." : undefined },

    // Abandoned checkouts
    { id: "cartsAbandoned", group: "Abandoned carts", label: "Checkouts abandoned", value: openCarts.length.toLocaleString(), keywords: "abandoned cart basket checkout left dropped" },
    { id: "cartsValue", group: "Abandoned carts", label: "Value left behind", value: money(abandonedValue), keywords: "abandoned cart value money lost basket" },
    { id: "cartsRecovered", group: "Abandoned carts", label: "Carts recovered", value: recoveredCarts.length.toLocaleString(), keywords: "abandoned cart recovered returned bought reminder" },
    { id: "cartsRecoveredValue", group: "Abandoned carts", label: "Revenue recovered", value: money(recoveredValue), keywords: "abandoned cart recovered revenue money won back" },
    { id: "cartsRecoveryRate", group: "Abandoned carts", label: "Recovery rate", value: pct(recoveredCarts.length, carts.length), keywords: "abandoned cart recovery rate percent reminder works" },
    { id: "cartsAbandonRate", group: "Abandoned carts", label: "Abandonment rate", value: pct(openCarts.length, checkoutsStarted), keywords: "abandoned cart rate percent drop off", note: "Against checkouts we saw an email on, plus completed orders. Somebody who left before typing an email is not counted." },
    { id: "cartsReminders", group: "Abandoned carts", label: "Reminders scheduled", value: remindersSent.toLocaleString(), keywords: "abandoned cart reminder email sent resend" },
    { id: "cartsAverage", group: "Abandoned carts", label: "Average abandoned basket", value: openCarts.length ? money(Math.round(abandonedValue / openCarts.length)) : "—", keywords: "abandoned cart average basket size value" },

    // List
    { id: "mailable", group: "Email list", label: "Mailable contacts", value: mailable.length.toLocaleString(), keywords: "email list subscribers mailable marketing size", note: "All time." },
    { id: "newSubscribers", group: "Email list", label: "New subscribers", value: newSubscribers.length.toLocaleString(), keywords: "email list growth signups new subscribers" },
    { id: "heldNotMailable", group: "Email list", label: "Held, not mailable", value: heldNotMailable.length.toLocaleString(), keywords: "email contacts never opted in rsvp held", hint: "Gave us an address for something else, like an RSVP, and never asked for marketing.", note: "All time." },
    { id: "unsubscribed", group: "Email list", label: "Unsubscribed", value: unsubscribed.length.toLocaleString(), keywords: "email unsubscribed opt out left list", note: "All time." },

    // Reviews
    { id: "reviewsPublished", group: "Reviews", label: "Reviews published", value: publishedReviews.length.toLocaleString(), keywords: "reviews ratings published approved stars" },
    { id: "reviewsPending", group: "Reviews", label: "Awaiting moderation", value: pendingReviews.length.toLocaleString(), keywords: "reviews pending moderation queue approve" },
    { id: "reviewRating", group: "Reviews", label: "Average rating", value: publishedReviews.length ? `${averageRating.toFixed(1)} / 5` : "—", keywords: "reviews rating stars average score" },
    { id: "reviewRequests", group: "Reviews", label: "Review requests sent", value: reviewRequests.length.toLocaleString(), keywords: "reviews requests email asked resend" },
    { id: "reviewResponse", group: "Reviews", label: "Request response rate", value: pct(reviews.length, reviewRequests.length), keywords: "reviews response rate replied conversion", hint: "Reviews written against requests sent in the period." },

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
      blurb: "Browsing through to a paid online order.",
      steps: [
        { label: "Shop views", value: pageCounts.get("/shop") ?? 0 },
        {
          label: "Product views",
          value: [...pageCounts.entries()]
            .filter(([path]) => path.startsWith("/shop/"))
            .reduce((sum, [, n]) => sum + n, 0),
        },
        { label: "Cart views", value: pageCounts.get("/cart") ?? 0 },
        { label: "Reached checkout", value: pageCounts.get("/checkout") ?? 0 },
        { label: "Gave an email", value: carts.length },
        // Online, not every order: a POS sale at the bottom of a funnel
        // that starts with shop page views would read as a conversion the
        // website earned, and it is not one.
        { label: "Online orders", value: onlineOrders.length },
      ],
    },
    {
      id: "recovery",
      title: "Checkout recovery",
      blurb: "What happens to a basket somebody walked away from.",
      steps: [
        { label: "Gave an email at checkout", value: carts.length },
        { label: "Did not finish", value: carts.length - recoveredCarts.length },
        { label: "Reminder scheduled", value: remindersSent },
        { label: "Came back and bought", value: recoveredCarts.length },
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
    truncated,
    kpis,
    viewsByDay: series(periodDays, viewsByDayCounts),
    revenueByDay: series(periodDays, revenueByDayCounts),
    onlineRevenueByDay: series(periodDays, onlineByDayCounts),
    abandonedByDay: series(periodDays, abandonedByDayCounts),
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
