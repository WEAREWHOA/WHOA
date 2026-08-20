"use server";

import { redirect } from "next/navigation";
import { getByCode, getByEmail, setPayout } from "./store";
import type { PayoutSettings } from "./types";

export async function loginAction(formData: FormData) {
  const from = String(formData.get("from") || "/login");
  const code = String(formData.get("code") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!code && !email) {
    redirect(`${from}?error=missing`);
  }

  const ambassador = code ? await getByCode(code) : await getByEmail(email);

  if (!ambassador) {
    redirect(`${from}?error=notfound`);
  }

  redirect(`/portal/${ambassador.code}`);
}

export async function updatePayoutAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const method = String(formData.get("method") || "").trim() as PayoutSettings["method"];
  const destination = String(formData.get("destination") || "").trim();

  if (!code || !destination || !["paypal", "venmo", "bank"].includes(method)) {
    redirect(`/portal/${code}?error=payout`);
  }

  await setPayout(code, { method, destination });
  redirect(`/portal/${code}?saved=1`);
}
