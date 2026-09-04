import { randomUUID } from "crypto";
import { getSupabase } from "./supabase";
import { EVENTS, type EventInfo } from "./events";

export interface EventRsvpRecord {
  id: string;
  eventId: string;
  accountCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  priceCents: number;
  squareOrderId: string | null;
  squarePaymentId: string | null;
  createdAt: string;
}

interface EventRsvpRow {
  id: string;
  event_id: string;
  account_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  price_cents: number;
  square_order_id: string | null;
  square_payment_id: string | null;
  created_at: string;
}

function mapRow(row: EventRsvpRow): EventRsvpRecord {
  return {
    id: row.id,
    eventId: row.event_id,
    accountCode: row.account_code,
    name: row.name,
    email: row.email,
    phone: row.phone,
    priceCents: row.price_cents,
    squareOrderId: row.square_order_id,
    squarePaymentId: row.square_payment_id,
    createdAt: row.created_at,
  };
}

export async function createRsvpRecord(input: {
  eventId: string;
  accountCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  priceCents: number;
  squareOrderId?: string | null;
  squarePaymentId?: string | null;
}): Promise<void> {
  const { error } = await getSupabase()
    .from("event_rsvps")
    .insert({
      id: `rsvp_${randomUUID()}`,
      event_id: input.eventId,
      account_code: input.accountCode,
      name: input.name,
      email: input.email,
      phone: input.phone,
      price_cents: input.priceCents,
      square_order_id: input.squareOrderId ?? null,
      square_payment_id: input.squarePaymentId ?? null,
    });

  if (error) {
    throw new Error(`Failed to record RSVP: ${error.message}`);
  }
}

// Powers the portal's Events tab — every RSVP/ticket linked to this
// account, newest first. Callers split into upcoming/past themselves by
// matching eventId against lib/events.ts's EVENTS (the source of truth for
// dates), since this table only knows what was true at RSVP time.
export async function getRsvpsForAccount(accountCode: string): Promise<EventRsvpRecord[]> {
  const { data, error } = await getSupabase()
    .from("event_rsvps")
    .select("*")
    .eq("account_code", accountCode)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load RSVPs: ${error.message}`);
  }

  return (data ?? []).map((row) => mapRow(row as EventRsvpRow));
}

export interface EventHistoryEntry {
  rsvp: EventRsvpRecord;
  event: EventInfo;
}

// Joins this account's RSVP/ticket records against the static EVENTS list
// (the source of truth for dates) and splits into upcoming vs. past for
// the portal's Events tab. A record whose event was since removed from
// EVENTS is dropped rather than shown with missing details. Called on
// every portal page load — never throws, same posture as
// squareCustomers.ts's getCustomerHistory — a Supabase hiccup here should
// degrade to "nothing to show yet," not break the whole dashboard.
export async function getEventHistoryForAccount(
  accountCode: string,
): Promise<{ upcoming: EventHistoryEntry[]; past: EventHistoryEntry[] }> {
  try {
    const rsvps = await getRsvpsForAccount(accountCode);
    const todayKey = new Date().toISOString().slice(0, 10);

    const upcoming: EventHistoryEntry[] = [];
    const past: EventHistoryEntry[] = [];

    for (const rsvp of rsvps) {
      const event = EVENTS.find((e) => e.id === rsvp.eventId);
      if (!event) continue;
      const entry: EventHistoryEntry = { rsvp, event };
      const endDate = event.endDate ?? event.startDate;
      if (endDate >= todayKey) upcoming.push(entry);
      else past.push(entry);
    }

    // Upcoming soonest-first, past most-recent-first.
    upcoming.sort((a, b) => a.event.startDate.localeCompare(b.event.startDate));
    past.sort((a, b) => b.event.startDate.localeCompare(a.event.startDate));

    return { upcoming, past };
  } catch (err) {
    console.error("getEventHistoryForAccount failed:", err);
    return { upcoming: [], past: [] };
  }
}
