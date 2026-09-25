import { channelById } from "./channels";
import { getSupabase } from "./supabase";
import { searchAccounts } from "./store";

/**
 * One person's history across the whole platform, on one timeline.
 *
 * The aggregate journey map answers "where does Instagram traffic go".
 * This answers the other half — "what actually happened to this person"
 * — by merging every table that carries an account_code into a single
 * ordered list.
 *
 * Read-only and deliberately narrow: it shows what someone did here, not
 * who they are. No addresses, no payment details, no message contents.
 */

/** How far back the page trail goes. A journey is a story, not a log. */
const VIEW_LIMIT = 200;

export type JourneyEventKind =
  | "account" | "view" | "rsvp" | "checkin" | "stamp"
  | "prize" | "preorder" | "referral";

export interface JourneyEvent {
  at: string;
  kind: JourneyEventKind;
  /** One line, already written for a human. */
  label: string;
  detail?: string;
}

export interface JourneySummary {
  code: string;
  name: string;
  email: string;
  joinedAt: string | null;
  /** First channel we ever saw them arrive from. */
  firstChannel: string | null;
  views: number;
  sessions: number;
  tickets: number;
  stamps: number;
  prizes: number;
  events: JourneyEvent[];
  /** True when the page trail was cut at VIEW_LIMIT. */
  trimmed: boolean;
}

export interface AccountMatch {
  code: string;
  name: string;
  email: string;
}

/** Find someone by name, email or code. Thin on purpose — the picker
 *  shouldn't hand back more about a person than it needs to show. */
export async function findAccounts(query: string): Promise<AccountMatch[]> {
  const accounts = await searchAccounts(query).catch(() => []);
  // Same view of accounts the Super Admin search already gives, so this
  // can't surface anyone that tool wouldn't.
  return accounts
    .slice(0, 10)
    .map((a) => ({ code: a.code, name: a.name, email: a.email }));
}

async function rows<T>(
  table: string,
  columns: string,
  code: string,
  limit?: number,
): Promise<T[]> {
  try {
    const base = getSupabase().from(table).select(columns).eq("account_code", code);
    const { data, error } = await (limit ? base.limit(limit) : base);
    if (error) {
      // A table that was never migrated shouldn't blank the timeline —
      // that strand is just missing.
      console.error(`Journey: failed to read ${table}:`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  } catch (err) {
    console.error(`Journey: failed to read ${table}:`, err);
    return [];
  }
}

export async function getCustomerJourney(rawCode: string): Promise<JourneySummary | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const matches = await searchAccounts(code).catch(() => []);
  const account = matches.find((a) => a.code.toUpperCase() === code);
  if (!account) return null;

  const [views, rsvps, stamps, gamePrizes, waterPrizes, preorders, referrals] = await Promise.all([
    rows<{ path: string; channel: string | null; session_id: string; is_entry: boolean | null; created_at: string }>(
      "page_views", "path, channel, session_id, is_entry, created_at", code, VIEW_LIMIT + 1),
    rows<{ event_id: string; quantity: number; price_cents: number; checked_in_at: string | null; created_at: string }>(
      "event_rsvps", "event_id, quantity, price_cents, checked_in_at, created_at", code),
    rows<{ slot: string; stamped_at: string }>("scavenger_stamps", "slot, stamped_at", code),
    rows<{ prize: string; reward: string; code: string; redeemed_at: string | null; claimed_at: string }>(
      "game_prize_claims", "prize, reward, code, redeemed_at, claimed_at", code),
    rows<{ code: string; redeemed_at: string | null; claimed_at: string }>(
      "water_prize_claims", "code, redeemed_at, claimed_at", code),
    rows<{ total_cents: number; status: string; created_at: string }>(
      "oasis_preorders", "total_cents, status, created_at", code),
    rows<{ customer: string; sale_amount: number; commission: number; order_date: string }>(
      "orders", "customer, sale_amount, commission, order_date", code),
  ]);

  const events: JourneyEvent[] = [];
  const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (account.createdAt) {
    events.push({ at: account.createdAt, kind: "account", label: "Created their WHOA account" });
  }

  const trimmed = views.length > VIEW_LIMIT;
  for (const view of views.slice(0, VIEW_LIMIT)) {
    events.push({
      at: view.created_at,
      kind: "view",
      label: view.path,
      detail: view.is_entry
        ? `Arrived from ${channelById(view.channel).label}`
        : undefined,
    });
  }

  for (const rsvp of rsvps) {
    const tickets = rsvp.quantity || 1;
    events.push({
      at: rsvp.created_at,
      kind: "rsvp",
      label: `${tickets} ticket${tickets === 1 ? "" : "s"} — ${rsvp.event_id}`,
      detail: rsvp.price_cents ? money(rsvp.price_cents * tickets) : "Free RSVP",
    });
    if (rsvp.checked_in_at) {
      events.push({
        at: rsvp.checked_in_at,
        kind: "checkin",
        label: `Checked in at ${rsvp.event_id}`,
      });
    }
  }

  for (const stamp of stamps) {
    events.push({ at: stamp.stamped_at, kind: "stamp", label: "Scavenger stamp" });
  }

  for (const prize of gamePrizes) {
    events.push({
      at: prize.claimed_at, kind: "prize",
      label: `Claimed ${prize.reward} (${prize.prize})`, detail: prize.code,
    });
    if (prize.redeemed_at) {
      events.push({ at: prize.redeemed_at, kind: "prize", label: `Collected ${prize.reward}` });
    }
  }

  for (const prize of waterPrizes) {
    events.push({ at: prize.claimed_at, kind: "prize", label: "Claimed an H2WHOA prize", detail: prize.code });
    if (prize.redeemed_at) {
      events.push({ at: prize.redeemed_at, kind: "prize", label: "Collected their H2WHOA prize" });
    }
  }

  for (const order of preorders) {
    events.push({
      at: order.created_at, kind: "preorder",
      label: `Oasis pre-order — ${order.status}`, detail: money(order.total_cents ?? 0),
    });
  }

  for (const order of referrals) {
    events.push({
      at: order.order_date, kind: "referral",
      label: `Referred a sale to ${order.customer}`,
      detail: `$${Number(order.sale_amount || 0).toFixed(2)} · $${Number(order.commission || 0).toFixed(2)} commission`,
    });
  }

  events.sort((a, b) => b.at.localeCompare(a.at));

  // The entry view furthest back is how they first found us.
  const firstEntry = views
    .filter((v) => v.is_entry)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];

  return {
    code: account.code,
    name: account.name,
    email: account.email,
    joinedAt: account.createdAt ?? null,
    firstChannel: firstEntry ? channelById(firstEntry.channel).label : null,
    views: views.length,
    sessions: new Set(views.map((v) => v.session_id)).size,
    tickets: rsvps.reduce((sum, r) => sum + (r.quantity || 1), 0),
    stamps: stamps.length,
    prizes: gamePrizes.length + waterPrizes.length,
    events,
    trimmed,
  };
}
