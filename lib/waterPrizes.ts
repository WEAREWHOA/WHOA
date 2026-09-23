import { getSupabase } from "./supabase";

/**
 * A claimed H2WHOA prize.
 *
 * Spinning is anonymous and lives on the device; claiming is not. Tying a
 * win to an account is what stops one person collecting a sticker from
 * every bottle on the shelf, and gives the WHOAdega something to check.
 */

/** No lookalike characters — staff read these off someone's screen. */
const CODE_ALPHABET = "ACDEFHJKLMNPRTWXY3479";

function makeCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `H2W-${code}`;
}

export interface WaterPrizeClaim {
  code: string;
  claimedAt: string;
  redeemedAt: string | null;
  /** True when this account had already claimed before today's spin. */
  alreadyHeld: boolean;
}

/**
 * Issues this account's prize code, or hands back the one it already has.
 *
 * Deliberately idempotent: someone who spins on their phone, claims, then
 * opens the page on a laptop should see the same code rather than a second
 * sticker. The unique constraint on account_code is what enforces that
 * even if two requests land at once — a duplicate insert is turned back
 * into a read rather than an error.
 */
export async function claimWaterPrize(accountCode: string): Promise<WaterPrizeClaim> {
  const supabase = getSupabase();
  const code = accountCode.trim().toUpperCase();

  const existing = await supabase
    .from("water_prize_claims")
    .select("code, claimed_at, redeemed_at")
    .eq("account_code", code)
    .maybeSingle();

  if (existing.error) throw new Error(`Failed to read water prize claim: ${existing.error.message}`);

  if (existing.data) {
    return {
      code: existing.data.code as string,
      claimedAt: existing.data.claimed_at as string,
      redeemedAt: (existing.data.redeemed_at as string | null) ?? null,
      alreadyHeld: true,
    };
  }

  const inserted = await supabase
    .from("water_prize_claims")
    .insert({ account_code: code, code: makeCode() })
    .select("code, claimed_at, redeemed_at")
    .single();

  if (inserted.error) {
    // 23505 is a unique violation — someone else's request won the race.
    // Read theirs back instead of failing; either way this account ends up
    // with exactly one code.
    if (inserted.error.code === "23505") {
      const retry = await supabase
        .from("water_prize_claims")
        .select("code, claimed_at, redeemed_at")
        .eq("account_code", code)
        .maybeSingle();
      if (retry.data) {
        return {
          code: retry.data.code as string,
          claimedAt: retry.data.claimed_at as string,
          redeemedAt: (retry.data.redeemed_at as string | null) ?? null,
          alreadyHeld: true,
        };
      }
    }
    throw new Error(`Failed to record water prize claim: ${inserted.error.message}`);
  }

  return {
    code: inserted.data.code as string,
    claimedAt: inserted.data.claimed_at as string,
    redeemedAt: (inserted.data.redeemed_at as string | null) ?? null,
    alreadyHeld: false,
  };
}
