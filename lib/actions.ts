"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import {
  createAmbassador,
  createLink,
  deactivateAccount,
  getByEmail,
  getCredentialsByCode,
  getCredentialsByEmail,
  setPayout,
  updateAccountInfo,
  updatePasswordHash,
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

  let target: string;
  try {
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
    target = `/portal/${credentials.code}`;
  } catch (err) {
    // redirect()/notFound() work by throwing — let those pass through
    // untouched and only treat genuine failures as errors.
    unstable_rethrow(err);
    console.error("loginAction failed:", err);
    redirect(`${from}?error=server`);
  }

  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

// Lightweight universal signup: just email + password, no confirmation
// email. This is the front door for the shared backend portal — every
// account (customer, ambassador, vendor, musician, crew) starts here as a
// plain account with just the Customer tab. Extra tabs are unlocked by a
// Super Admin (or automatically by the full /apply ambassador flow).
export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) {
    redirect("/login?mode=signup&error=missing");
  }

  if (password.length < 8) {
    redirect("/login?mode=signup&error=weak-password");
  }

  let target: string;
  try {
    const existing = await getByEmail(email);
    if (existing) {
      redirect("/login?mode=signup&error=exists");
    }

    const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Member";
    const passwordHash = await hashPassword(password);
    const ambassador = await createAmbassador({ name, email, passwordHash });

    await createSession(ambassador.code);
    target = `/portal/${ambassador.code}?new=1`;
  } catch (err) {
    unstable_rethrow(err);
    console.error("registerAction failed:", err);
    redirect("/login?mode=signup&error=server");
  }

  redirect(target);
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

export async function updateAccountInfoAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const instagram = String(formData.get("instagram") || "").trim();

  if (!name) redirect(`/portal/${code}?settingsError=missing`);
  if (!email || !email.includes("@")) redirect(`/portal/${code}?settingsError=email`);

  try {
    // Same "is this email already someone else's" check as registerAction —
    // just allow it when it's already this account's own email.
    const existing = await getByEmail(email);
    if (existing && existing.code.toUpperCase() !== code.toUpperCase()) {
      redirect(`/portal/${code}?settingsError=email-taken`);
    }
    await updateAccountInfo(code, { name, email, instagram: instagram || null });
  } catch (err) {
    unstable_rethrow(err);
    console.error("updateAccountInfoAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  redirect(`/portal/${code}?settingsSaved=1`);
}

export async function changePasswordAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) redirect(`/portal/${code}?settingsError=weak-password`);
  if (newPassword !== confirmPassword) redirect(`/portal/${code}?settingsError=password-mismatch`);

  try {
    const credentials = await getCredentialsByCode(code);
    if (!credentials) redirect(`/portal/${code}?settingsError=server`);

    const valid = await verifyPassword(currentPassword, credentials.passwordHash);
    if (!valid) redirect(`/portal/${code}?settingsError=wrong-password`);

    const passwordHash = await hashPassword(newPassword);
    await updatePasswordHash(code, passwordHash);
  } catch (err) {
    unstable_rethrow(err);
    console.error("changePasswordAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  redirect(`/portal/${code}?passwordChanged=1`);
}

// Deactivates the login (see lib/store.ts's deactivateAccount) — never a
// real row delete, so orders/links/commissions/RSVPs tied to this account
// stay intact. Requires re-entering the current password first, same
// re-authenticate-before-anything-destructive posture most account
// settings pages use.
export async function deleteAccountAction(formData: FormData) {
  const code = String(formData.get("code") || "").trim();
  const sessionCode = await getSessionAmbassadorCode();
  if (!sessionCode || sessionCode.toUpperCase() !== code.toUpperCase()) {
    redirect("/login");
  }

  const password = String(formData.get("password") || "");

  try {
    const credentials = await getCredentialsByCode(code);
    if (!credentials) redirect(`/portal/${code}?settingsError=server`);

    const valid = await verifyPassword(password, credentials.passwordHash);
    if (!valid) redirect(`/portal/${code}?settingsError=wrong-password`);

    await deactivateAccount(code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("deleteAccountAction failed:", err);
    redirect(`/portal/${code}?settingsError=server`);
  }

  await destroySession();
  redirect("/login?accountDeleted=1");
}
