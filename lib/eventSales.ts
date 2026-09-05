import { getSupabase } from "./supabase";
import { EVENTS, type EventInfo } from "./events";

export interface EventSalesApplicationInput {
  ambassadorCode: string;
  name: string;
  email: string;
  phone: string;
  instagram?: string;
  message?: string;
}

// A durable record of every "SELL FOR US" submission, for staff reference
// alongside the notification email. Approval itself is just flipping
// perm_event_sales on for the account (from Super Admin) — this table
// doesn't gate anything on its own.
export async function recordEventSalesApplication(input: EventSalesApplicationInput): Promise<void> {
  const { error } = await getSupabase().from("event_sales_applications").insert({
    ambassador_code: input.ambassadorCode,
    name: input.name,
    email: input.email,
    phone: input.phone,
    instagram: input.instagram || null,
    message: input.message || null,
  });

  if (error) {
    throw new Error(`Failed to record Sell For Us application: ${error.message}`);
  }
}

export type EventSignupStatus = "pending" | "approved" | "declined";

export interface EventSalesSignup {
  id: string;
  ambassadorCode: string;
  eventId: string;
  status: EventSignupStatus;
  createdAt: string;
  reviewedAt: string | null;
}

interface EventSalesSignupRow {
  id: string;
  ambassador_code: string;
  event_id: string;
  status: EventSignupStatus;
  created_at: string;
  reviewed_at: string | null;
}

function mapSignup(row: EventSalesSignupRow): EventSalesSignup {
  return {
    id: row.id,
    ambassadorCode: row.ambassador_code,
    eventId: row.event_id,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

// One row per (account, event) — enforced by a unique constraint, so
// signing up twice for the same event surfaces as an error instead of a
// duplicate request.
export async function requestEventWorkSignup(
  ambassadorCode: string,
  eventId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await getSupabase()
    .from("event_sales_signups")
    .insert({ ambassador_code: ambassadorCode, event_id: eventId });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "You've already signed up to work this event." };
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

// Powers the EVENT SALES tab — this account's own signup for every event,
// so the tab can show the right state (sign-up button, pending, approved,
// declined) per event.
export async function getSignupsForAccount(ambassadorCode: string): Promise<EventSalesSignup[]> {
  const { data, error } = await getSupabase()
    .from("event_sales_signups")
    .select("*")
    .eq("ambassador_code", ambassadorCode);

  if (error) throw new Error(`Failed to load event work signups: ${error.message}`);

  return (data ?? []).map((row) => mapSignup(row as EventSalesSignupRow));
}

export interface ScheduleEntry {
  signup: EventSalesSignup;
  event: EventInfo;
}

// The EVENT SALES tab's "your schedule" — every event this account is
// approved to work, soonest first.
export async function getScheduleForAccount(ambassadorCode: string): Promise<ScheduleEntry[]> {
  const signups = await getSignupsForAccount(ambassadorCode);
  const entries: ScheduleEntry[] = [];

  for (const signup of signups) {
    if (signup.status !== "approved") continue;
    const event = EVENTS.find((e) => e.id === signup.eventId);
    if (event) entries.push({ signup, event });
  }

  entries.sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));
  return entries;
}

export interface PendingSignupWithEvent {
  signup: EventSalesSignup;
  event: EventInfo;
  accountName: string;
  accountEmail: string;
}

// Powers the EVENTS ADMIN tab's "Work signup requests" section — every
// pending signup across every account, joined against the static EVENTS
// list for display. Unscoped, so callers must already have confirmed the
// caller is allowed to see it (Super Admin or the eventsAdmin permission).
export async function getPendingWorkSignups(): Promise<PendingSignupWithEvent[]> {
  const { data, error } = await getSupabase()
    .from("event_sales_signups")
    .select("*, ambassadors(name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load pending work signups: ${error.message}`);

  const rows = (data ?? []) as (EventSalesSignupRow & {
    ambassadors: { name: string; email: string } | null;
  })[];

  const result: PendingSignupWithEvent[] = [];
  for (const row of rows) {
    const event = EVENTS.find((e) => e.id === row.event_id);
    if (!event) continue;
    result.push({
      signup: mapSignup(row),
      event,
      accountName: row.ambassadors?.name ?? "Unknown",
      accountEmail: row.ambassadors?.email ?? "",
    });
  }
  return result;
}

export async function reviewWorkSignup(id: string, status: "approved" | "declined"): Promise<void> {
  const { error } = await getSupabase()
    .from("event_sales_signups")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(`Failed to review work signup: ${error.message}`);
}
