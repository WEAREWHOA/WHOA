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
  // Which lineup artist the guest said they're there for — optional, picked
  // from event.lineup on the RSVP/ticket form. Null means no preference.
  selectedArtist: string | null;
  // When the guest agreed to the damage-responsibility waiver — null if the
  // event didn't require one (see lib/events.ts's requiresDamageWaiver).
  waiverAgreedAt: string | null;
  // When they were admitted at the door, and by whom. Null means they
  // haven't arrived — and is also the lock that makes a ticket
  // single-use (see checkInRsvp).
  checkedInAt: string | null;
  checkedInBy: string | null;
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
  selected_artist: string | null;
  waiver_agreed_at: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
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
    selectedArtist: row.selected_artist,
    waiverAgreedAt: row.waiver_agreed_at,
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by,
    createdAt: row.created_at,
  };
}

// Returns the new record's id — the caller needs it to generate the
// presentable-ticket QR code (see app/events/actions.ts).
export async function createRsvpRecord(input: {
  eventId: string;
  accountCode: string | null;
  name: string;
  email: string;
  phone: string | null;
  priceCents: number;
  squareOrderId?: string | null;
  squarePaymentId?: string | null;
  selectedArtist?: string | null;
  waiverAgreedAt?: string | null;
}): Promise<string> {
  const id = `rsvp_${randomUUID()}`;
  const { error } = await getSupabase()
    .from("event_rsvps")
    .insert({
      id,
      event_id: input.eventId,
      account_code: input.accountCode,
      name: input.name,
      email: input.email,
      phone: input.phone,
      price_cents: input.priceCents,
      square_order_id: input.squareOrderId ?? null,
      square_payment_id: input.squarePaymentId ?? null,
      selected_artist: input.selectedArtist ?? null,
      waiver_agreed_at: input.waiverAgreedAt ?? null,
    });

  if (error) {
    throw new Error(`Failed to record RSVP: ${error.message}`);
  }

  return id;
}

// Backs the public /checkin/[rsvpId] ticket-details page — deliberately
// has no auth check (same posture as a paper ticket: whoever has the QR
// code/link can see it) and no attendance-marking side effect. Verifying
// entry and preventing a ticket being reused is real door-staff tooling
// this doesn't attempt to be yet.
export async function getRsvpById(id: string): Promise<EventRsvpRecord | undefined> {
  const { data, error } = await getSupabase().from("event_rsvps").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Failed to look up RSVP: ${error.message}`);
  }

  return data ? mapRow(data as EventRsvpRow) : undefined;
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

// Every RSVP/ticket on file, across every event — powers the EVENTS ADMIN
// tab's KPIs and guest lists. Unlike getRsvpsForAccount this is unscoped, so
// callers must already have confirmed the caller is allowed to see it.
export async function getAllRsvps(): Promise<EventRsvpRecord[]> {
  const { data, error } = await getSupabase()
    .from("event_rsvps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load all RSVPs: ${error.message}`);
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

/** Every ticket/RSVP for one event, newest arrivals last — the door list. */
export async function getRsvpsForEvent(eventId: string): Promise<EventRsvpRecord[]> {
  const { data, error } = await getSupabase()
    .from("event_rsvps")
    .select("*")
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) throw new Error(`Failed to load the guest list: ${error.message}`);
  return (data ?? []).map((row) => mapRow(row as EventRsvpRow));
}

export type CheckInOutcome =
  /** Admitted. This is the only outcome that lets someone through the door. */
  | { status: "admitted"; rsvp: EventRsvpRecord }
  /** Refused: this ticket was already spent. Carries when, and by whom. */
  | { status: "already-used"; rsvp: EventRsvpRecord }
  /** Refused: no such ticket — a fake QR, or one from another system. */
  | { status: "not-found" }
  /** Refused: a real ticket, but not for the event being worked tonight. */
  | { status: "wrong-event"; rsvp: EventRsvpRecord };

/**
 * Spends a ticket at the door.
 *
 * A used ticket is refused outright, which is the whole point: without
 * this, one screenshot admits a queue. The refusal has to be *atomic*,
 * not a read-then-write — two staff scanning the same code at the same
 * moment would both read "not checked in" and both wave their guest
 * through. So the null check lives in the UPDATE's own WHERE clause:
 * exactly one of them updates a row, and the other matches nothing and
 * gets "already-used".
 *
 * `expectedEventId` guards the other mistake a door makes — last month's
 * ticket, or a ticket for the other room — by refusing anything that
 * isn't tonight rather than silently admitting it.
 */
export async function checkInRsvp(
  rsvpId: string,
  byCode: string,
  expectedEventId?: string,
): Promise<CheckInOutcome> {
  const supabase = getSupabase();

  const existing = await getRsvpById(rsvpId);
  if (!existing) return { status: "not-found" };
  if (expectedEventId && existing.eventId !== expectedEventId) {
    return { status: "wrong-event", rsvp: existing };
  }
  // Cheap pre-check so the common refusal doesn't need a write at all.
  // Not the real guard — the UPDATE below is.
  if (existing.checkedInAt) return { status: "already-used", rsvp: existing };

  const { data, error } = await supabase
    .from("event_rsvps")
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: byCode.trim().toUpperCase() })
    .eq("id", rsvpId)
    .is("checked_in_at", null)
    .select("*");

  if (error) throw new Error(`Failed to check that ticket in: ${error.message}`);

  const updated = (data ?? [])[0];
  if (!updated) {
    // Nothing matched, and we know the row exists: somebody else spent it
    // between the read above and this write. Re-read so the refusal can
    // say who and when.
    const now = await getRsvpById(rsvpId);
    return now ? { status: "already-used", rsvp: now } : { status: "not-found" };
  }

  return { status: "admitted", rsvp: mapRow(updated as EventRsvpRow) };
}

/**
 * Undoes a check-in.
 *
 * Refusing a used ticket means a mis-scan locks a real guest out, so the
 * door needs a way back. Deliberately not "toggle": staff choose to undo,
 * which is hard to do by accident on a phone in the dark.
 */
export async function undoCheckIn(rsvpId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("event_rsvps")
    .update({ checked_in_at: null, checked_in_by: null })
    .eq("id", rsvpId)
    .not("checked_in_at", "is", null)
    .select("id");

  if (error) throw new Error(`Failed to undo that check-in: ${error.message}`);
  return (data ?? []).length > 0;
}

/**
 * Pulls a ticket id out of whatever the scanner read.
 *
 * The QR encodes a full `/checkin/<id>` URL, but a camera in a dark room
 * also picks up partial reads and the odd hand-typed id, so this accepts
 * either the URL or a bare id rather than failing on a technicality.
 * Returns undefined for anything that isn't shaped like one of ours —
 * a Wi-Fi QR on the wall behind the queue shouldn't reach the database.
 */
export function parseTicketId(scanned: string): string | undefined {
  const text = scanned.trim();
  if (!text) return undefined;

  const match = text.match(/rsvp_[0-9a-fA-F-]{36}/);
  return match ? match[0] : undefined;
}
