import { getSupabase } from "./supabase";

/**
 * A prize won in a game, claimed to an account.
 *
 * Mirrors lib/waterPrizes.ts deliberately: the code only exists once
 * there's an account behind it, so one person is worth one prize per
 * game no matter how many times they play.
 */

/** No lookalike characters — staff read these off someone's screen. */
const CODE_ALPHABET = "ACDEFHJKLMNPRTWXY3479";

export type PrizeGame = "snake" | "scavenger";

/** What a prize can be. Stored as the words staff hand it over by. */
export const REWARDS = ["FREE STICKER", "H2WHOA WATER"] as const;
export type Reward = (typeof REWARDS)[number];

export function isReward(value: unknown): value is Reward {
  return typeof value === "string" && (REWARDS as readonly string[]).includes(value);
}

const PREFIX: Record<PrizeGame, string> = { snake: "SNK", scavenger: "SSBD" };

function makeCode(game: PrizeGame): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `${PREFIX[game]}-${code}`;
}

export interface PrizeClaim {
  code: string;
  reward: string;
  claimedAt: string;
  redeemedAt: string | null;
  /** True when this account already held this game's prize. */
  alreadyHeld: boolean;
}

function toClaim(row: Record<string, unknown>, alreadyHeld: boolean): PrizeClaim {
  return {
    code: row.code as string,
    reward: row.reward as string,
    claimedAt: row.claimed_at as string,
    redeemedAt: (row.redeemed_at as string | null) ?? null,
    alreadyHeld,
  };
}

const COLUMNS = "code, reward, claimed_at, redeemed_at";

/** This account's prize for a game, or null if it hasn't claimed one. */
export async function getGamePrize(
  accountCode: string,
  game: PrizeGame,
): Promise<PrizeClaim | null> {
  const { data, error } = await getSupabase()
    .from("game_prize_claims")
    .select(COLUMNS)
    .eq("account_code", accountCode.trim().toUpperCase())
    .eq("prize", game)
    .maybeSingle();

  if (error) throw new Error(`Failed to read the game prize: ${error.message}`);
  return data ? toClaim(data, true) : null;
}

/**
 * Issues this account's prize for a game, or hands back the one it
 * already has.
 *
 * Idempotent on purpose: someone who claims on their phone and then
 * opens the page on a laptop should see the same code rather than a
 * second sticker. The unique constraint enforces that even when two
 * requests land at once — a duplicate insert is turned back into a read.
 */
export async function claimGamePrize(
  accountCode: string,
  game: PrizeGame,
  reward: Reward,
): Promise<PrizeClaim> {
  const code = accountCode.trim().toUpperCase();

  const existing = await getGamePrize(code, game);
  if (existing) return existing;

  const inserted = await getSupabase()
    .from("game_prize_claims")
    .insert({ account_code: code, prize: game, code: makeCode(game), reward })
    .select(COLUMNS)
    .single();

  if (inserted.error) {
    // 23505 is a unique violation — another request won the race. Read
    // theirs back rather than failing; either way this account ends up
    // with exactly one code for this game.
    if (inserted.error.code === "23505") {
      const retry = await getGamePrize(code, game);
      if (retry) return retry;
    }
    throw new Error(`Failed to claim the game prize: ${inserted.error.message}`);
  }

  return toClaim(inserted.data, false);
}
