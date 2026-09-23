"use server";

import { resolveAccount } from "@/lib/accountAuth";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { claimWaterPrize } from "@/lib/waterPrizes";

export interface WaterClaimResult {
  ok: boolean;
  error?: string;
  /** The code to show at the WHOAdega. Only ever set when ok. */
  code?: string;
  /** True when this account already had a code before now. */
  alreadyHeld?: boolean;
}

/**
 * Claims the sticker. An account is required — that's the point.
 *
 * Signing in and signing up are the same call: resolveAccount takes an
 * existing session if there is one, signs in an email it recognises, and
 * creates an account otherwise. Someone who just scanned a bottle
 * shouldn't have to work out which of those they are.
 */
export async function claimWaterPrizeAction(input: {
  name?: string;
  email?: string;
  password?: string;
}): Promise<WaterClaimResult> {
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
    const claim = await claimWaterPrize(account.code);
    return { ok: true, code: claim.code, alreadyHeld: claim.alreadyHeld };
  } catch (err) {
    console.error("Failed to claim the H2WHOA prize:", err);
    return {
      ok: false,
      error: "Your account is set up, but we couldn't issue the code — try again in a moment.",
    };
  }
}
