import { randomInt } from "crypto";
import { getSupabase } from "./supabase";
import { makePrizeCode } from "./gamePrizes";

/**
 * The spin wheel: one spin per account, ever.
 *
 * THE DRAW HAPPENS HERE, NOT IN THE BROWSER. The wheel on screen is an
 * animation of a decision the server already made and wrote down. A
 * client-side draw would be a prize table anybody could read out of the
 * bundle and a result anybody could edit in a debugger, and the top
 * prize is a $50 gift card.
 *
 * Stored in game_prize_claims, the table the snake and scavenger prizes
 * already use, under prize = 'spin'. That is not a shortcut: the unique
 * constraint on (account_code, prize) is exactly the "one spin per
 * account" rule, enforced by the database rather than by a check that
 * two simultaneous requests could both pass. It also means no migration
 * -- the table, the index and the redemption columns are already there.
 */

export const SPIN_PRIZE = "spin";

export type SpinPrizeId = "gift-card" | "small" | "stickers";

export interface SpinSegment {
  id: SpinPrizeId;
  /** What the wheel and the claim screen say. */
  label: string;
  /** Chances out of 100. Must total 100 -- asserted below. */
  weight: number;
  /** The wedge colour, from the site's own flame palette. */
  color: string;
  /** Readable on that colour. */
  ink: string;
}

/**
 * The prize table.
 *
 * The weights are also the wedge sizes on the wheel, deliberately: a
 * wheel whose gift-card slice looked like a third of the circle while
 * paying out two times in a hundred would be a lie told in pictures.
 * Two per cent is a sliver, and it should look like one.
 */
export const SPIN_SEGMENTS: SpinSegment[] = [
  { id: "gift-card", label: "$50 GIFT CARD", weight: 2, color: "#ffd12f", ink: "#0a0806" },
  { id: "small", label: "KEYCHAIN OR LIGHTER", weight: 28, color: "#ff7a00", ink: "#0a0806" },
  { id: "stickers", label: "STICKER PACK", weight: 70, color: "#ff2f1a", ink: "#f7f0e6" },
];

const TOTAL_WEIGHT = SPIN_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
if (TOTAL_WEIGHT !== 100) {
  // Thrown at import time rather than at spin time: a table that does
  // not add up is a bug in this file, and the moment to find out is the
  // build, not the first person who spins.
  throw new Error(`Spin wheel weights must total 100, got ${TOTAL_WEIGHT}`);
}

/** What the winner of the middle prize picked. */
export const SMALL_CHOICES = ["KEYCHAIN", "LIGHTER"] as const;
export type SmallChoice = (typeof SMALL_CHOICES)[number];

export function isSmallChoice(value: unknown): value is SmallChoice {
  return typeof value === "string" && (SMALL_CHOICES as readonly string[]).includes(value);
}

export function segmentById(id: string): SpinSegment | undefined {
  return SPIN_SEGMENTS.find((segment) => segment.id === id);
}

/**
 * Picks a prize.
 *
 * crypto.randomInt rather than Math.random: this decides who gets money
 * off, and Math.random is a predictable generator seeded per process.
 * The range is half-open and uniform, which is what makes the weights
 * mean what they say.
 */
export function drawSegment(): SpinSegment {
  const roll = randomInt(TOTAL_WEIGHT);
  let seen = 0;
  for (const segment of SPIN_SEGMENTS) {
    seen += segment.weight;
    if (roll < seen) return segment;
  }
  // Unreachable while the weights total 100, which is asserted above.
  return SPIN_SEGMENTS[SPIN_SEGMENTS.length - 1];
}

export interface SpinResult {
  /** Which wedge it landed on. */
  segmentId: SpinPrizeId;
  /** The prize as staff hand it over: the choice, once one is made. */
  reward: string;
  code: string;
  spunAt: string;
  redeemedAt: string | null;
  /** True when this spin had already happened before this request. */
  alreadySpun: boolean;
  /** The middle prize is two things until they pick one. */
  needsChoice: boolean;
}

const COLUMNS = "code, reward, claimed_at, redeemed_at, segment";

interface Row {
  code: string;
  reward: string;
  claimed_at: string;
  redeemed_at: string | null;
  segment?: string | null;
}

function toResult(row: Row, alreadySpun: boolean): SpinResult {
  // The segment is derived from the reward where the column isn't
  // there, so this keeps working against the table as it stands today.
  const segmentId: SpinPrizeId =
    (row.segment as SpinPrizeId | undefined) ??
    (row.reward.includes("GIFT CARD")
      ? "gift-card"
      : row.reward.includes("STICKER")
        ? "stickers"
        : "small");

  return {
    segmentId,
    reward: row.reward,
    code: row.code,
    spunAt: row.claimed_at,
    redeemedAt: row.redeemed_at,
    alreadySpun,
    needsChoice: segmentId === "small" && !isSmallChoice(row.reward),
  };
}

/** Columns that exist for certain, for a database without the optional one. */
const SAFE_COLUMNS = "code, reward, claimed_at, redeemed_at";

function missingColumn(error: { message?: string; code?: string }): boolean {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

/** This account's spin, or null if they have not spun. */
export async function getSpin(accountCode: string): Promise<SpinResult | null> {
  const code = accountCode.trim().toUpperCase();

  for (const columns of [COLUMNS, SAFE_COLUMNS]) {
    const { data, error } = await getSupabase()
      .from("game_prize_claims")
      .select(columns)
      .eq("account_code", code)
      .eq("prize", SPIN_PRIZE)
      .maybeSingle();

    if (!error) return data ? toResult(data as unknown as Row, true) : null;
    if (!missingColumn(error)) throw new Error(`Failed to read the spin: ${error.message}`);
  }

  return null;
}

/**
 * Spins, once.
 *
 * Idempotent, like the game prizes it sits beside: somebody who spins on
 * their phone and then opens the page on a laptop sees the same result
 * rather than a second go. The unique constraint settles a race, and a
 * duplicate insert is turned back into a read -- so two taps a
 * millisecond apart cannot produce two prizes.
 */
export async function spin(accountCode: string): Promise<SpinResult> {
  const code = accountCode.trim().toUpperCase();

  const existing = await getSpin(code);
  if (existing) return existing;

  const segment = drawSegment();

  const insert = async (withSegment: boolean) =>
    getSupabase()
      .from("game_prize_claims")
      .insert({
        account_code: code,
        prize: SPIN_PRIZE,
        code: makePrizeCode("SPIN"),
        reward: segment.label,
        ...(withSegment ? { segment: segment.id } : {}),
      })
      .select(withSegment ? COLUMNS : SAFE_COLUMNS)
      .single();

  let result = await insert(true);
  if (result.error && missingColumn(result.error)) result = await insert(false);

  if (result.error) {
    // 23505 is a unique violation: another request won the race. Read
    // theirs back, so this account still has exactly one spin.
    if (result.error.code === "23505") {
      const retry = await getSpin(code);
      if (retry) return retry;
    }
    throw new Error(`Failed to record the spin: ${result.error.message}`);
  }

  return toResult(result.data as unknown as Row, false);
}

/**
 * Records which of the two middle prizes they picked.
 *
 * Scoped in the query to a row that has not been redeemed and still
 * holds the unchosen label, so this can neither change a prize somebody
 * has already collected nor be replayed to swap a keychain for a
 * lighter after the fact.
 */
export async function chooseSmallPrize(
  accountCode: string,
  choice: SmallChoice,
): Promise<SpinResult | null> {
  const code = accountCode.trim().toUpperCase();

  const { error } = await getSupabase()
    .from("game_prize_claims")
    .update({ reward: choice })
    .eq("account_code", code)
    .eq("prize", SPIN_PRIZE)
    .eq("reward", "KEYCHAIN OR LIGHTER")
    .is("redeemed_at", null);

  if (error) throw new Error(`Failed to record the prize choice: ${error.message}`);

  return getSpin(code);
}
