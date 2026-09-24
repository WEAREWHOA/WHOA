import { getSupabase } from "./supabase";

/**
 * The Creation Station scavenger card.
 *
 * Every flyer carries the same printed URL (/go), so the server cannot
 * tell one from another — a scan at the far wall and a scan of the flyer
 * someone is already standing at arrive as identical requests. The card
 * doesn't try to police that. People walk the room because the flyers are
 * spread around it, not because a database made them.
 *
 * So a stamp is simply a stamp: no cooldown, no waiting, nothing to
 * out-wait. What the card does keep is one stamp per page load, which is
 * the only thing standing between a hunt and a button that fills the card
 * in four seconds of tapping. Rescanning any flyer is a new page load, so
 * it never stops anyone who is actually out there scanning.
 *
 * The tap matters for a second reason: /go is the URL on the flyers, so
 * stamping on arrival would mean a refresh, a route prefetch or the back
 * button each looked like a scan, and the card would fill itself while
 * someone was reading it.
 */

/** Squares on the card. */
export const STAMPS_TO_COMPLETE = 6;

/** Names for the six squares, filled in order. Decoration: with one URL
 *  we can't know which flyer was scanned, and labelling a square after a
 *  specific one would be a small lie printed on the page. */
export const STAMP_LABELS = ["DUNE", "FLARE", "TIDE", "GUST", "STONE", "ECHO"];

/** Stored in scavenger_stamps.slot. Ordinals, so the unique index on
 *  (account_code, slot) caps a card at six and stops a double-tapped
 *  button becoming two stamps. */
function slotId(ordinal: number): string {
  return `slot-${ordinal}`;
}

export interface CardState {
  /** Stamps earned, 0–6. */
  count: number;
  complete: boolean;
}

const EMPTY_CARD: CardState = { count: 0, complete: false };

function normalize(accountCode: string): string {
  return accountCode.trim().toUpperCase();
}

function toCard(rowCount: number): CardState {
  const count = Math.min(rowCount, STAMPS_TO_COMPLETE);
  return { count, complete: count >= STAMPS_TO_COMPLETE };
}

/** Where an account's card stands. */
export async function getCardState(accountCode: string): Promise<CardState> {
  try {
    const { data, error } = await getSupabase()
      .from("scavenger_stamps")
      .select("slot")
      .eq("account_code", normalize(accountCode));

    if (error) {
      console.error("Failed to load the scavenger card:", error.message);
      return EMPTY_CARD;
    }

    return toCard((data ?? []).length);
  } catch (err) {
    console.error("Failed to load the scavenger card:", err);
    return EMPTY_CARD;
  }
}

/** Lowest square not yet stamped, so a deleted row can't collide. */
function nextOrdinal(taken: Set<string>): number | undefined {
  for (let i = 1; i <= STAMPS_TO_COMPLETE; i += 1) {
    if (!taken.has(slotId(i))) return i;
  }
  return undefined;
}

export type StampOutcome = "stamped" | "complete" | "signed-out" | "failed";

export interface StampResult {
  outcome: StampOutcome;
  state: CardState;
}

/** Stamps the next square. Called from a tap, never from a page load. */
export async function recordStamp(accountCode: string): Promise<StampResult> {
  const code = normalize(accountCode);

  let taken: Set<string>;

  try {
    const { data, error } = await getSupabase()
      .from("scavenger_stamps")
      .select("slot")
      .eq("account_code", code);

    if (error) {
      console.error("Failed to read the scavenger card before stamping:", error.message);
      return { outcome: "failed", state: EMPTY_CARD };
    }

    taken = new Set((data ?? []).map((row) => row.slot as string));
  } catch (err) {
    console.error("Failed to read the scavenger card before stamping:", err);
    return { outcome: "failed", state: EMPTY_CARD };
  }

  const state = toCard(taken.size);
  if (state.complete) return { outcome: "complete", state };

  const ordinal = nextOrdinal(taken);
  if (ordinal === undefined) return { outcome: "complete", state: toCard(STAMPS_TO_COMPLETE) };

  try {
    const { error } = await getSupabase()
      .from("scavenger_stamps")
      .insert({ account_code: code, slot: slotId(ordinal) });

    // 23505 is the unique violation: two taps raced and the other won.
    // Their stamp is recorded, so that's a success, not a miss.
    if (error && error.code !== "23505") {
      console.error("Failed to record a scavenger stamp:", error.message);
      return { outcome: "failed", state };
    }
  } catch (err) {
    console.error("Failed to record a scavenger stamp:", err);
    return { outcome: "failed", state };
  }

  return { outcome: "stamped", state: toCard(state.count + 1) };
}
