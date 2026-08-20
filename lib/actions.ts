"use server";

import { redirect } from "next/navigation";
import {
  createLink,
  getCredentialsByCode,
  getCredentialsByEmail,
  setPayout,
} from "./store";
import { createSession, destroySession, getSessionAmbassadorCode, verifyPassword } from "./auth";
import type { PayoutSettings } from "./types";

export async function loginAction(formData: FormData) {
  const from = String(formData.get("from") || "/login");
  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");

  if (!identifier || !password) {
    redirect(`${from}?error=missing`);
  }

  const credentials = identifier.includes("@")
    ? await getCredentialsByEmail(identifier)
    : await getCredentialsByCode(identifier);

  if (!credentials) {
    redirect(`${from}?error=notfound`);
  }

  const valid = await verifyPassword(password, credentials.passwordHash);
  if (!valid) {
    redirect(`${from}?error=invalid`);
  }

  await createSession(credentials.code);
  redirect(`/portal/${credentials.code}`);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function createLinkAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const label = String(formData.get("label") || "").trim();

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode !== code) {
    redirect("/login");
  }

  if (!label) {
    redirect(`/portal/${code}?error=link`);
  }

  await createLink(code, label);
  redirect(`/portal/${code}?linkAdded=1`);
}

export async function updatePayoutAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const method = String(formData.get("method") || "").trim() as PayoutSettings["method"];
  const destination = String(formData.get("destination") || "").trim();

  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode !== code) {
    redirect("/login");
  }

  if (!code || !destination || !["paypal", "venmo", "bank"].includes(method)) {
    redirect(`/portal/${code}?error=payout`);
  }

  await setPayout(code, { method, destination });
  redirect(`/portal/${code}?saved=1`);
}
