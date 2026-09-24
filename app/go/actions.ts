"use server";

import { revalidatePath } from "next/cache";
import { resolveAccount } from "@/lib/accountAuth";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { recordStamp, type StampResult } from "@/lib/scavenger";

export interface EnterResult {
  ok: boolean;
  error?: string;
}

/**
 * The door into the experience. Signing in and signing up are one call:
 * resolveAccount takes an existing session, signs in an email it knows,
 * and creates an account otherwise — nobody standing at a festival should
 * have to work out which of those they are.
 */
export async function enterExperienceAction(input: {
  name?: string;
  email?: string;
  password?: string;
}): Promise<EnterResult> {
  const alreadyIn = await getSessionAmbassadorCode().catch(() => null);
  if (alreadyIn) return { ok: true };

  const name = input.name?.trim().slice(0, 200) ?? "";
  const email = input.email?.trim().slice(0, 200) ?? "";
  const password = input.password ?? "";

  if (!name) return { ok: false, error: "Enter your name." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
  if (password.length < 8) return { ok: false, error: "Use a password of at least 8 characters." };

  const account = await resolveAccount({ name, email, password });
  if (account.error) return { ok: false, error: account.error };
  if (!account.code) {
    return { ok: false, error: "We couldn't sign you in — check your details and try again." };
  }

  return { ok: true };
}

/**
 * Takes a stamp. A tap, never a page load — see recordStamp for why.
 *
 * Both pages that can stamp are revalidated, so the count in the /go
 * banner and the squares on the card never disagree about where someone
 * is.
 */
export async function stampAction(): Promise<StampResult> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) {
    return {
      outcome: "signed-out",
      state: { count: 0, complete: false },
    };
  }

  const result = await recordStamp(code);

  if (result.outcome === "stamped") {
    revalidatePath("/go");
    revalidatePath("/go/scavenger");
  }

  return result;
}
