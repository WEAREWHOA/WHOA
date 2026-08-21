"use server";

import { redirect } from "next/navigation";
import {
  createAmbassador,
  createLink,
  getByEmail,
  getCredentialsByCode,
  getCredentialsByEmail,
  setPayout,
} from "./store";
import { createSession, destroySession, getSessionAmbassadorCode, hashPassword, verifyPassword } from "./auth";
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

// Lightweight universal signup: just email + password, no confirmation
// email. Creates the same underlying account as the full ambassador
// /apply flow (so the new account lands on the same tabbed dashboard
// with every tab visible), just skipping name/instagram collection.
export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    redirect("/login?mode=signup&error=missing");
  }

  if (password.length < 8) {
    redirect("/login?mode=signup&error=weak-password");
  }

  const existing = await getByEmail(email);
  if (existing) {
    redirect("/login?mode=signup&error=exists");
  }

  const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Member";
  const passwordHash = await hashPassword(password);
  const ambassador = await createAmbassador({ name, email, passwordHash });

  await createSession(ambassador.code);
  redirect(`/portal/${ambassador.code}?new=1`);
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
