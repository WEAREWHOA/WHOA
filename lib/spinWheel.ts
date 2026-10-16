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
  /** What the claim screen says, and what staff hand over. */
  label: string;
  /** The shorter form, for a 22.5 degree slice of wheel. */
  short: string;
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
 * The weights are the odds and nothing else. They are NOT the wedge
 * sizes: the wheel is sixteen equal slices, which is what a prize wheel
 * looks like, and the slice it stops on is chosen from the ones bearing
 * the prize the server already drew. So the picture is a fair wheel and
 * the draw is a weighted one, and the only number that decides anything
 * is in this table.
 */
export const SPIN_SEGMENTS: SpinSegment[] = [
  {
    id: "gift-card",
    label: "$50 GIFT CARD",
    short: "$50 GIFT CARD",
    weight: 2,
    color: "#ffd12f",
    ink: "#0a0806",
  },
  {
    id: "small",
    label: "KEYCHAIN OR LIGHTER",
    short: "KEYCHAIN / LIGHTER",
    weight: 28,
    color: "#ff7a00",
    ink: "#0a0806",
  },
  {
    id: "stickers",
    label: "STICKER PACK",
    short: "STICKERS",
    weight: 70,
    color: "#ff2f1a",
    ink: "#f7f0e6",
  },
];

/**
 * Which prize each of the sixteen slices carries, clockwise from the
 * top.
 *
 * One gift card, five keychain/lighter and ten stickers: near enough to
 * the real odds that the wheel does not misrepresent them, spread out
 * so no prize sits in one solid block. The count per prize does not
 * decide anything -- drawSegment does -- it only decides where the
 * pointer can come to rest.
 */
export const WHEEL_SLICES: SpinPrizeId[] = [
  "gift-card",
  "stickers",
  "small",
  "stickers",
  "stickers",
  "small",
  "stickers",
  "stickers",
  "small",
  "stickers",
  "stickers",
  "small",
  "stickers",
  "stickers",
  "small",
  "stickers",
];

// Every prize has to be reachable on the wheel, or a winner would have
// nowhere for the pointer to stop. Checked at import, like the weights.
for (const segment of SPIN_SEGMENTS) {
  if (!WHEEL_SLICES.includes(segment.id)) {
    throw new Error(`No wheel slice carries the prize "${segment.id}"`);
  }
}

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

const COLUMNS = "code, reward, claimed_at, redeemed_at";

interface Row {
  code: string;
  reward: string;
  claimed_at: string;
  redeemed_at: string | null;
}

/**
 * Which wedge a stored prize came from.
 *
 * Derived from the reward rather than stored in a column of its own.
 * There was a `segment` column here briefly and it was a bug: this
 * table (migration 0030) has no such column, so every insert was
 * rejected and every spin failed. Deriving it costs nothing and cannot
 * drift, because the three rewards are distinguishable by their own
 * text -- including after a choice is made, where "KEYCHAIN" and
 * "LIGHTER" both fall through to the middle prize they came from.
 */
function segmentOf(reward: string): SpinPrizeId {
  if (reward.includes("GIFT CARD")) return "gift-card";
  if (reward.includes("STICKER")) return "stickers";
  return "small";
}

function toResult(row: Row, alreadySpun: boolean): SpinResult {
  const segmentId = segmentOf(row.reward);

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

/** This account's spin, or null if they have not spun. */
export async function getSpin(accountCode: string): Promise<SpinResult | null> {
  const code = accountCode.trim().toUpperCase();

  const { data, error } = await getSupabase()
    .from("game_prize_claims")
    .select(COLUMNS)
    .eq("account_code", code)
    .eq("prize", SPIN_PRIZE)
    .maybeSingle();

  if (error) throw new Error(`Failed to read the spin: ${error.message}`);
  return data ? toResult(data as unknown as Row, true) : null;
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

  const result = await getSupabase()
    .from("game_prize_claims")
    .insert({
      account_code: code,
      prize: SPIN_PRIZE,
      code: makePrizeCode("SPIN"),
      reward: segment.label,
    })
    .select(COLUMNS)
    .single();

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
