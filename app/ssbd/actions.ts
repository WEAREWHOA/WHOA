"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import { createAmbassador, getByEmail, getCredentialsByCode, getCredentialsByEmail, updatePermissions } from "@/lib/store";
import { createSession, getSessionAmbassadorCode, hashPassword, verifyPassword } from "@/lib/auth";
import { grantEventWorkSignup } from "@/lib/eventSales";
import { SSBD_CREW_HUB, SSBD_EVENT_ID } from "@/lib/ssbdCrew";

/**
 * Optional shared passcode, off unless SSBD_CREW_CODE is set in the
 * environment.
 *
 * The page is a public URL that hands out crew access to a hub carrying
 * staff phone numbers and load-in details, so there needs to be a way to
 * close it that doesn't need a deploy. Unset — the default — it behaves
 * exactly as asked: anyone with the link is in.
 */
function requiredCode(): string | undefined {
  return process.env.SSBD_CREW_CODE?.trim() || undefined;
}

function checkCode(formData: FormData): void {
  const required = requiredCode();
  if (!required) return;
  if (String(formData.get("crewCode") || "").trim() !== required) {
    redirect("/ssbd?error=code");
  }
}

/** Whether the page should ask for a passcode at all. */
export async function ssbdCodeRequired(): Promise<boolean> {
  return requiredCode() !== undefined;
}

/**
 * The whole point of this page: one account, both things granted.
 *
 * Event Sales unlocks the tab; the approved signup is what the crew hub
 * checks (see app/event-sales/ssbd-2026/page.tsx). Doing only one leaves
 * them looking at a tab with nothing in it, so they move together.
 */
async function onboard(code: string): Promise<void> {
  await updatePermissions(code, { permissions: { eventSales: true } });
  await grantEventWorkSignup(code, SSBD_EVENT_ID);
}

/** Someone already signed in — one button, no re-typing their password. */
export async function ssbdJoinAction(formData: FormData) {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/ssbd?error=session");

  checkCode(formData);

  try {
    await onboard(code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("ssbdJoinAction failed:", err);
    redirect("/ssbd?error=server");
  }

  redirect(SSBD_CREW_HUB);
}

/**
 * New crew, no account yet.
 *
 * Name is asked for and required, unlike the site's plain email+password
 * signup: this list becomes a crew roster and a shift schedule that staff
 * read, and "jsmith92" on a call sheet helps nobody.
 *
 * An email that already has an account is sent to log in rather than
 * quietly having its password reset — same rule as every other signup
 * flow on the site.
 */
export async function ssbdSignupAction(formData: FormData) {
  checkCode(formData);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!name || !email || !email.includes("@")) redirect("/ssbd?error=missing");
  if (password.length < 8) redirect("/ssbd?error=weak-password");

  try {
    if (await getByEmail(email)) redirect("/ssbd?mode=login&error=exists");

    const passwordHash = await hashPassword(password);
    const created = await createAmbassador({ name, email, passwordHash });
    await createSession(created.code);
    await onboard(created.code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("ssbdSignupAction failed:", err);
    redirect("/ssbd?error=server");
  }

  redirect(SSBD_CREW_HUB);
}

/** Existing account — log in and get onboarded in the same submit. */
export async function ssbdLoginAction(formData: FormData) {
  checkCode(formData);

  const identifier = String(formData.get("identifier") || "").trim();
  const password = String(formData.get("password") || "");
  if (!identifier || !password) redirect("/ssbd?mode=login&error=missing");

  try {
    const credentials = identifier.includes("@")
      ? await getCredentialsByEmail(identifier)
      : await getCredentialsByCode(identifier);

    if (!credentials) redirect("/ssbd?mode=login&error=notfound");
    if (!(await verifyPassword(password, credentials.passwordHash))) {
      redirect("/ssbd?mode=login&error=invalid");
    }

    await createSession(credentials.code);
    await onboard(credentials.code);
  } catch (err) {
    unstable_rethrow(err);
    console.error("ssbdLoginAction failed:", err);
    redirect("/ssbd?mode=login&error=server");
  }

  redirect(SSBD_CREW_HUB);
}
