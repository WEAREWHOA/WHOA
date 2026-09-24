import { getSupabase } from "./supabase";

/**
 * The Creation Station scavenger hunt.
 *
 * Six stickers, spread around Creation Station. Each carries a different
 * token in its URL — /go?s=dune, /go?s=flare and so on — and stamps its
 * own square on the card.
 *
 * The distinct tokens are the whole mechanism. Six identical /go stickers
 * would be unenforceable: scanning one of them six times would look
 * exactly like walking to six, so the hunt would be a formality. Which
 * six someone finds doesn't matter, only that they're six different ones.
 */

export interface ScavengerSlot {
  /** Stored on the stamp. Renaming a token later won't orphan stamps. */
  id: string;
  /** What goes in the printed QR's URL: /go?s=<token>. */
  token: string;
  /** Shown on the stamped square. */
  label: string;
}

export const SCAVENGER_SLOTS: ScavengerSlot[] = [
  { id: "slot-1", token: "dune", label: "DUNE" },
  { id: "slot-2", token: "flare", label: "FLARE" },
  { id: "slot-3", token: "tide", label: "TIDE" },
  { id: "slot-4", token: "gust", label: "GUST" },
  { id: "slot-5", token: "stone", label: "STONE" },
  { id: "slot-6", token: "echo", label: "ECHO" },
];

export const STAMPS_TO_COMPLETE = SCAVENGER_SLOTS.length;

/** The slot a scanned token belongs to, or undefined if it's not ours. */
export function slotForToken(token: string | undefined | null): ScavengerSlot | undefined {
  if (!token) return undefined;
  const clean = token.trim().toLowerCase();
  return SCAVENGER_SLOTS.find((slot) => slot.token === clean);
}

export type StampOutcome = "stamped" | "already-had-it" | "unknown-code" | "failed";

export interface StampResult {
  outcome: StampOutcome;
  slot?: ScavengerSlot;
}

/**
 * Records a scan. Idempotent per slot: scanning a sticker you already
 * found tells you so rather than quietly doing nothing, which is what
 * someone standing in front of it needs to hear.
 */
export async function recordStamp(accountCode: string, token: string): Promise<StampResult> {
  const slot = slotForToken(token);
  if (!slot) return { outcome: "unknown-code" };

  const code = accountCode.trim().toUpperCase();

  try {
    const { error } = await getSupabase()
      .from("scavenger_stamps")
      .insert({ account_code: code, slot: slot.id });

    if (error) {
      // 23505 is the unique violation — they've already got this one.
      if (error.code === "23505") return { outcome: "already-had-it", slot };
      console.error("Failed to record a scavenger stamp:", error.message);
      return { outcome: "failed", slot };
    }

    return { outcome: "stamped", slot };
  } catch (err) {
    console.error("Failed to record a scavenger stamp:", err);
    return { outcome: "failed", slot };
  }
}

/** Slot ids this account has stamped. */
export async function getStampedSlotIds(accountCode: string): Promise<Set<string>> {
  try {
    const { data, error } = await getSupabase()
      .from("scavenger_stamps")
      .select("slot")
      .eq("account_code", accountCode.trim().toUpperCase());

    if (error) {
      console.error("Failed to load scavenger stamps:", error.message);
      return new Set();
    }

    return new Set((data ?? []).map((row) => row.slot as string));
  } catch (err) {
    console.error("Failed to load scavenger stamps:", err);
    return new Set();
  }
}
