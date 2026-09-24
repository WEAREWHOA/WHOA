import { getSupabase } from "./supabase";

/**
 * The Creation Station scavenger card.
 *
 * Six stickers are spread around Creation Station and every one of them
 * carries the same printed URL — /go. That is the constraint this file is
 * built around, and it is worth being blunt about what it costs: the
 * server cannot tell one sticker from another, so it cannot know whether
 * someone walked to six of them or stood in front of one. Nothing in the
 * request distinguishes those two people.
 *
 * So the card doesn't pretend to. What it does enforce is the part of the
 * hunt that actually takes effort: spreading the six stamps out over
 * time. A stamp is a deliberate tap, and the next one won't land until
 * STAMP_COOLDOWN_MS has passed, which makes filling the card cost about
 * as long as walking the room. Someone determined to fake it can still
 * sit in one place and tap every couple of minutes — they just don't get
 * to do it in ten seconds, and they've spent the same time everyone else
 * spent.
 *
 * If the stickers are ever reprinted, give each one its own URL
 * (/go?s=dune and so on) and the hunt becomes properly enforceable: six
 * different tokens really are six different stickers.
 */

/** Squares on the card. */
export const STAMPS_TO_COMPLETE = 6;

/**
 * How long between stamps. The whole integrity of the card rests on this
 * number: it's the difference between a hunt and a button you press six
 * times. Long enough to mean crossing the room, short enough that nobody
 * gives up standing still.
 */
export const STAMP_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Names for the six squares, filled in order. They're the card's
 * decoration, not sticker identities — with one URL we can't know which
 * sticker was scanned, and labelling a square "DUNE" when we don't know
 * that would be a small lie printed on the page.
 */
export const STAMP_LABELS = ["DUNE", "FLARE", "TIDE", "GUST", "STONE", "ECHO"];

/** Stored in scavenger_stamps.slot. Ordinals, so the unique index on
 *  (account_code, slot) stops a double tap becoming two stamps. */
function slotId(ordinal: number): string {
  return `slot-${ordinal}`;
}

export interface CardState {
  /** Stamps earned, 0–6. */
  count: number;
  complete: boolean;
  /**
   * When the next stamp can be taken, in epoch ms, or null if one is
   * available now. Sent to the browser as a timestamp rather than a
   * remaining duration so a page left open counts down correctly.
   */
  nextStampAt: number | null;
  /**
   * The server's clock when the card was read, in whole seconds. Read
   * here rather than during render — a page component calling Date.now()
   * is an impure render, and the countdown needs a server value the
   * browser can hydrate against without disagreeing by a second.
   */
  asOfSecond: number;
}

function emptyCard(now: number): CardState {
  return { count: 0, complete: false, nextStampAt: null, asOfSecond: Math.floor(now / 1000) };
}

function normalize(accountCode: string): string {
  return accountCode.trim().toUpperCase();
}

/** Where an account's card stands right now. */
export async function getCardState(accountCode: string, now = Date.now()): Promise<CardState> {
  try {
    const { data, error } = await getSupabase()
      .from("scavenger_stamps")
      .select("slot, stamped_at")
      .eq("account_code", normalize(accountCode));

    if (error) {
      console.error("Failed to load the scavenger card:", error.message);
      return emptyCard(now);
    }

    const rows = data ?? [];
    const count = Math.min(rows.length, STAMPS_TO_COMPLETE);

    const lastStampedAt = rows.reduce((latest, row) => {
      const at = Date.parse(row.stamped_at as string);
      return Number.isFinite(at) && at > latest ? at : latest;
    }, 0);

    const readyAt = lastStampedAt ? lastStampedAt + STAMP_COOLDOWN_MS : 0;

    return {
      count,
      complete: count >= STAMPS_TO_COMPLETE,
      nextStampAt: readyAt > now ? readyAt : null,
      asOfSecond: Math.floor(now / 1000),
    };
  } catch (err) {
    console.error("Failed to load the scavenger card:", err);
    return emptyCard(now);
  }
}

/** Lowest square not yet stamped, so a deleted row can't collide. */
function nextOrdinal(taken: Set<string>): number | undefined {
  for (let i = 1; i <= STAMPS_TO_COMPLETE; i += 1) {
    if (!taken.has(slotId(i))) return i;
  }
  return undefined;
}

export type StampOutcome = "stamped" | "cooling-down" | "complete" | "signed-out" | "failed";

export interface StampResult {
  outcome: StampOutcome;
  state: CardState;
}

/**
 * Stamps the next square, if the cooldown has run out.
 *
 * Deliberately not called on page load. A stamp is a write, and /go is
 * the URL on the stickers: a refresh, a prefetch or a tap of the back
 * button would all look like a scan, and the card would fill itself while
 * someone read it.
 */
export async function recordStamp(accountCode: string, now = Date.now()): Promise<StampResult> {
  const code = normalize(accountCode);

  let taken: Set<string>;
  let state: CardState;

  try {
    const { data, error } = await getSupabase()
      .from("scavenger_stamps")
      .select("slot, stamped_at")
      .eq("account_code", code);

    if (error) {
      console.error("Failed to read the scavenger card before stamping:", error.message);
      return { outcome: "failed", state: emptyCard(now) };
    }

    const rows = data ?? [];
    taken = new Set(rows.map((row) => row.slot as string));
    const lastStampedAt = rows.reduce((latest, row) => {
      const at = Date.parse(row.stamped_at as string);
      return Number.isFinite(at) && at > latest ? at : latest;
    }, 0);
    const readyAt = lastStampedAt ? lastStampedAt + STAMP_COOLDOWN_MS : 0;
    state = {
      count: Math.min(rows.length, STAMPS_TO_COMPLETE),
      complete: rows.length >= STAMPS_TO_COMPLETE,
      nextStampAt: readyAt > now ? readyAt : null,
      asOfSecond: Math.floor(now / 1000),
    };
  } catch (err) {
    console.error("Failed to read the scavenger card before stamping:", err);
    return { outcome: "failed", state: emptyCard(now) };
  }

  if (state.complete) return { outcome: "complete", state };
  if (state.nextStampAt) return { outcome: "cooling-down", state };

  const ordinal = nextOrdinal(taken);
  if (ordinal === undefined) return { outcome: "complete", state: { ...state, complete: true } };

  try {
    const { error } = await getSupabase()
      .from("scavenger_stamps")
      .insert({ account_code: code, slot: slotId(ordinal) });

    if (error) {
      // 23505 is the unique violation: two taps raced and the other one
      // won. Their stamp is recorded, so this is a success, not a miss.
      if (error.code !== "23505") {
        console.error("Failed to record a scavenger stamp:", error.message);
        return { outcome: "failed", state };
      }
    }
  } catch (err) {
    console.error("Failed to record a scavenger stamp:", err);
    return { outcome: "failed", state };
  }

  const count = Math.min(state.count + 1, STAMPS_TO_COMPLETE);
  return {
    outcome: "stamped",
    state: {
      count,
      complete: count >= STAMPS_TO_COMPLETE,
      nextStampAt: count >= STAMPS_TO_COMPLETE ? null : now + STAMP_COOLDOWN_MS,
      asOfSecond: Math.floor(now / 1000),
    },
  };
}
