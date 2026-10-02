"use server";

import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { getNewsletterList, subscribe, type NewsletterList } from "@/lib/newsletter";

/**
 * The public one: anyone can call it, because anyone can subscribe.
 *
 * It never reports whether an address was already on the list. "You're
 * already subscribed" turns a signup box into a tool for checking whether
 * a given person is on it, which isn't a question a stranger gets to ask.
 */
export async function subscribeFooterAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const result = await subscribe({ email, source: "footer" }).catch((err) => {
    console.error("Footer newsletter signup failed:", err);
    return { ok: false, error: "Couldn't sign you up right now. Please try again later." };
  });
  return { ok: result.ok, error: result.error };
}

/**
 * The list itself reads every subscriber's address, so the permission is
 * re-checked on the server each time rather than trusted from a client
 * that could simply call the action.
 */
async function requireNewsletterAdmin(): Promise<boolean> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return false;
  const account = await getByCode(code).catch(() => null);
  if (!account) return false;
  return account.isSuperAdmin || account.permissions.newsletter;
}

export async function loadNewsletterListAction(): Promise<NewsletterList | null> {
  if (!(await requireNewsletterAdmin())) return null;
  return getNewsletterList();
}

/**
 * The checkout opt-in.
 *
 * Separate from the footer action so the source is recorded correctly:
 * someone who ticked a box while buying something is a different kind of
 * subscriber from someone who typed their address into a footer, and a
 * campaign aimed at buyers should be able to tell them apart.
 */
export async function subscribeCheckoutAction(input: {
  email: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ ok: boolean }> {
  const result = await subscribe({ ...input, source: "checkout" }).catch((err) => {
    console.error("Checkout newsletter opt-in failed:", err);
    return { ok: false };
  });
  return { ok: result.ok };
}
