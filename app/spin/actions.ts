"use server";

import { getSessionAmbassadorCode } from "@/lib/auth";
import {
  chooseSmallPrize,
  getSpin,
  isSmallChoice,
  spin,
  type SpinResult,
} from "@/lib/spinWheel";

export interface SpinActionResult {
  ok: boolean;
  error?: string;
  result?: SpinResult;
}

const SIGNED_OUT = "Sign in to spin.";

/**
 * Spins the wheel for the signed-in account.
 *
 * The account comes from the session cookie and never from the client:
 * an account code in the request body would let anybody spin on
 * somebody else's behalf, or spin repeatedly as a fresh code each time.
 */
export async function spinWheelAction(): Promise<SpinActionResult> {
  const code = await getSessionAmbassadorCode();
  if (!code) return { ok: false, error: SIGNED_OUT };

  try {
    return { ok: true, result: await spin(code) };
  } catch (err) {
    console.error("spinWheelAction failed:", err);
    return { ok: false, error: "The wheel jammed. Try again in a moment." };
  }
}

/** Records keychain or lighter, for the one prize that is a choice. */
export async function chooseSpinPrizeAction(choice: string): Promise<SpinActionResult> {
  const code = await getSessionAmbassadorCode();
  if (!code) return { ok: false, error: SIGNED_OUT };
  if (!isSmallChoice(choice)) return { ok: false, error: "Pick the keychain or the lighter." };

  try {
    const result = await chooseSmallPrize(code, choice);
    if (!result) return { ok: false, error: "We couldn't find your spin." };
    return { ok: true, result };
  } catch (err) {
    console.error("chooseSpinPrizeAction failed:", err);
    return { ok: false, error: "Couldn't save that choice. Try again." };
  }
}

/** What this account already has, for the page's first render. */
export async function getSpinAction(): Promise<SpinActionResult> {
  const code = await getSessionAmbassadorCode();
  if (!code) return { ok: false, error: SIGNED_OUT };

  try {
    return { ok: true, result: (await getSpin(code)) ?? undefined };
  } catch (err) {
    console.error("getSpinAction failed:", err);
    return { ok: false, error: "Couldn't load your spin." };
  }
}
