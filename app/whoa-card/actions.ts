"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { ensureWallet, redeemClaim } from "@/lib/wallet";

/**
 * Turning a code from the till into credit.
 *
 * Signed in only, and the account comes from the session rather than
 * the form. A hidden field naming whose card to credit is a hidden
 * field somebody can change.
 */
export async function redeemClaimAction(formData: FormData) {
  const accountCode = await getSessionAmbassadorCode();
  if (!accountCode) redirect("/login?from=/whoa-card");

  const code = String(formData.get("code") || "").trim();
  if (!code) redirect("/whoa-card?cardError=empty#redeem");

  try {
    // Their card is created on sight if they have never had one, so a
    // first redemption does not need a separate setup step.
    const card = await ensureWallet(accountCode);
    const result = await redeemClaim(code, accountCode, card.id);

    revalidatePath("/portal/wallet");
    if (result.outcome === "redeemed") {
      redirect(`/whoa-card?credited=${result.valueCents}#redeem`);
    }
    redirect(`/whoa-card?cardError=${result.outcome}#redeem`);
  } catch (err) {
    unstable_rethrow(err);
    console.error("redeemClaimAction failed for %s:", accountCode, err);
    redirect("/whoa-card?cardError=server#redeem");
  }
}

/** Open a card without redeeming anything, so the code exists to show. */
export async function openCardAction() {
  const accountCode = await getSessionAmbassadorCode();
  if (!accountCode) redirect("/login?from=/whoa-card");

  try {
    await ensureWallet(accountCode);
    revalidatePath("/portal/wallet");
  } catch (err) {
    unstable_rethrow(err);
    console.error("openCardAction failed for %s:", accountCode, err);
    redirect("/whoa-card?cardError=server");
  }
  redirect("/portal/wallet");
}
