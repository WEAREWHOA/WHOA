"use server";

import { resolveAccount } from "@/lib/accountAuth";
import { getSessionAmbassadorCode } from "@/lib/auth";
import {
  claimGamePrize,
  getGamePrize,
  isReward,
  type PrizeGame,
  type Reward,
} from "@/lib/gamePrizes";
import { getCardState } from "@/lib/scavenger";

export interface PrizeClaimResult {
  ok: boolean;
  error?: string;
  /** Shown at the counter. Only ever set when ok. */
  code?: string;
  reward?: string;
  /** True when this account already held this game's prize. */
  alreadyHeld?: boolean;
}

const GAMES: PrizeGame[] = ["snake", "scavenger"];

function isGame(value: unknown): value is PrizeGame {
  return typeof value === "string" && (GAMES as string[]).includes(value);
}

/**
 * Checks the account has actually earned the prize.
 *
 * The scavenger card lives in the database, so the six stamps are
 * verified here and a claim can't be forged by calling the action. The
 * snake score doesn't — it's a number in the browser, and there is no
 * honest way to confirm it server-side without rebuilding the game on
 * the server. That one is on trust, as it was when the reward was a
 * discount code; it's a sticker, and the table still caps it at one per
 * account.
 */
async function isEligible(accountCode: string, game: PrizeGame): Promise<boolean> {
  if (game !== "scavenger") return true;
  const card = await getCardState(accountCode);
  return card.complete;
}

/**
 * Claims a game prize. An account is required — that's what makes one
 * person worth one prize.
 *
 * Signing in and signing up are the same call: resolveAccount takes an
 * existing session, signs in an email it recognises, and creates an
 * account otherwise.
 */
export async function claimPrizeAction(input: {
  game: string;
  reward: string;
  name?: string;
  email?: string;
  password?: string;
}): Promise<PrizeClaimResult> {
  if (!isGame(input.game)) return { ok: false, error: "Unknown prize." };
  if (!isReward(input.reward)) return { ok: false, error: "Pick which prize you want." };

  const name = input.name?.trim().slice(0, 200) ?? "";
  const email = input.email?.trim().slice(0, 200) ?? "";
  const password = input.password ?? "";

  const signedIn = await getSessionAmbassadorCode().catch(() => null);

  if (!signedIn) {
    if (!name) return { ok: false, error: "Enter your name." };
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
    if (password.length < 8) return { ok: false, error: "Pick a password of at least 8 characters." };
  }

  const account = await resolveAccount({ name, email, password: password || undefined });
  if (account.error) return { ok: false, error: account.error };
  if (!account.code) {
    return { ok: false, error: "We couldn't sign you in — check your details and try again." };
  }

  try {
    if (!(await isEligible(account.code, input.game))) {
      return { ok: false, error: "Fill all six squares on your card first." };
    }

    const claim = await claimGamePrize(account.code, input.game, input.reward as Reward);
    return { ok: true, code: claim.code, reward: claim.reward, alreadyHeld: claim.alreadyHeld };
  } catch (err) {
    console.error("Failed to claim a game prize:", err);
    return { ok: false, error: "We couldn't save that claim. Try again in a moment." };
  }
}

/** The code this account already holds for a game, if any. */
export async function getPrizeAction(game: string): Promise<PrizeClaimResult> {
  if (!isGame(game)) return { ok: false };

  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return { ok: false };

  try {
    const claim = await getGamePrize(code, game);
    if (!claim) return { ok: false };
    return { ok: true, code: claim.code, reward: claim.reward, alreadyHeld: true };
  } catch (err) {
    console.error("Failed to read a game prize:", err);
    return { ok: false };
  }
}
