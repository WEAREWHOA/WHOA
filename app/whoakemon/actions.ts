"use server";

import { randomInt } from "crypto";
import { cookies } from "next/headers";

import { createStorePromo, getStorePromo, promoUsable } from "@/lib/storePromos";

/**
 * The Wand of WHOA.
 *
 * The prize is a real code, not a message saying you won one. It is
 * minted into the same store_promos table the checkout already reads,
 * single use and time limited, so finding the chest actually takes
 * 20% off something.
 *
 * WHAT THIS CANNOT DO. A game running in somebody's browser cannot
 * prove they played it: anybody who finds this action can call it.
 * So the prize is made cheap to give and expensive to farm rather
 * than defended, which is the honest trade for an easter egg:
 *
 *   one code per browser, remembered in a cookie, so a refresh or a
 *   second win hands back the same one rather than a new one;
 *   single use, so a code that gets shared is spent once;
 *   thirty days, so nothing minted today is still live next year.
 *
 * If that is too loose, the admin API can switch any of them off:
 * PATCH /api/admin/store-promos with active false.
 */

const PRIZE_PERCENT = 20;
const PRIZE_DAYS = 30;
const PRIZE_COOKIE = "whoa_wand";

/** No I/O/0/1, because this gets read off a screen and typed. */
const ALPHABET = "ACDEFGHJKMNPQRTUVWXYZ2346789";

function mintCode(): string {
  let out = "WAND";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export type WandPrize =
  | { ok: true; code: string; percent: number; already: boolean }
  | { ok: false; reason: string };

export async function claimWandAction(): Promise<WandPrize> {
  const jar = await cookies();
  const had = jar.get(PRIZE_COOKIE)?.value;

  // Hand back the one they already have rather than minting another.
  // Winning twice is winning the same thing twice.
  if (had) {
    const existing = await getStorePromo(had).catch(() => null);
    if (existing && promoUsable(existing).ok) {
      return { ok: true, code: existing.code, percent: existing.percent, already: true };
    }
    // Spent or expired: they can have another.
  }

  const endsAt = new Date(Date.now() + PRIZE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Twice, because a collision with an existing code is possible and
  // cheap to retry, and failing a prize over it would be absurd.
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = mintCode();
    const made = await createStorePromo({
      code,
      percent: PRIZE_PERCENT,
      label: "Wand of WHOA",
      endsAt,
      maxRedemptions: 1,
      createdBy: "whoakemon",
      note: "Found the chest in the hedges.",
    }).catch((err) => {
      console.error("Couldn't mint a Wand of WHOA code:", err);
      return { ok: false as const, error: "mint failed" };
    });

    if (made.ok) {
      jar.set(PRIZE_COOKIE, made.promo.code, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: PRIZE_DAYS * 24 * 60 * 60,
        path: "/",
      });
      return { ok: true, code: made.promo.code, percent: PRIZE_PERCENT, already: false };
    }
  }

  return {
    ok: false,
    reason: "The wand is yours, but the code would not mint. Get in touch and we will sort it.",
  };
}
