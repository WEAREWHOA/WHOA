"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { getSquare, getSquareLocationId } from "@/lib/square";
import { getByCode } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { REF_COOKIE } from "@/lib/attribution";
import type { CartLine } from "@/lib/types";
import type { Money } from "square";

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  orderId?: string;
}

export async function checkoutAction(input: {
  token: string;
  lines: CartLine[];
  customerName: string;
  customerEmail: string;
}): Promise<CheckoutResult> {
  if (input.lines.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const store = await cookies();
  const refCode = store.get(REF_COOKIE)?.value;
  // A referral-lookup hiccup should never block a real payment — worst
  // case, this one order just doesn't get the ambassador discount/commission.
  const ambassador = refCode
    ? await getByCode(refCode).catch((err) => {
        console.error("Referral lookup failed during checkout:", err);
        return undefined;
      })
    : undefined;

  const locationId = getSquareLocationId();
  const square = getSquare();

  let orderId: string;
  let totalMoney: Money;

  try {
    const orderResponse = await square.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        lineItems: input.lines.map((line) => ({
          catalogObjectId: line.variationId,
          quantity: String(line.quantity),
        })),
        discounts: ambassador
          ? [
              {
                name: `WHOA Ambassador (${ambassador.code})`,
                type: "FIXED_PERCENTAGE",
                percentage: "15",
                scope: "ORDER",
              },
            ]
          : undefined,
      },
    });

    if (!orderResponse.order?.id || orderResponse.order.totalMoney?.amount == null) {
      return { ok: false, error: "Couldn't create the order. Please try again." };
    }

    orderId = orderResponse.order.id;
    totalMoney = orderResponse.order.totalMoney;
  } catch (err) {
    console.error("Square order creation failed", err);
    return { ok: false, error: "Couldn't create the order. Please try again." };
  }

  try {
    const paymentResponse = await square.payments.create({
      sourceId: input.token,
      idempotencyKey: randomUUID(),
      amountMoney: totalMoney,
      locationId,
      orderId,
      buyerEmailAddress: input.customerEmail || undefined,
    });

    if (!paymentResponse.payment) {
      return { ok: false, error: "Payment did not complete. Please try again." };
    }
  } catch (err) {
    console.error("Square payment failed", err);
    return { ok: false, error: "Payment did not go through. Please check your card details." };
  }

  if (ambassador) {
    const saleAmount = Number(totalMoney.amount) / 100;
    const commission = Math.round(saleAmount * 0.1 * 100) / 100;

    const { error } = await getSupabase().from("orders").insert({
      id: `sq_${orderId}`,
      ambassador_code: ambassador.code,
      customer: input.customerName.trim() || "Online order",
      sale_amount: saleAmount,
      commission,
    });

    if (error) {
      // The payment already succeeded — don't fail the checkout over an
      // attribution bookkeeping error, just log it for follow-up.
      console.error("Failed to record ambassador commission", error);
    }
  }

  return { ok: true, orderId };
}
