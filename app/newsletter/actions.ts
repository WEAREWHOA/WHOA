"use server";

import { subscribe } from "@/lib/newsletter";

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
