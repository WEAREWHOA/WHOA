"use server";

import { recordContact, subscribe, TAG } from "@/lib/newsletter";

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
 *
 * `joinList` false is NOT a reason to forget them. They still bought
 * something, the Rolodex still needs the row, and the row still needs to
 * say plainly that they did not ask to be mailed — which is what the
 * `never` status recordContact writes is for. The alternative is finding
 * the address in a Square export two years later with no idea whether it
 * is allowed on a list.
 */
export async function subscribeCheckoutAction(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  joinList?: boolean;
}): Promise<{ ok: boolean }> {
  const { joinList = true, ...contact } = input;
  const tags = [TAG.customers];

  if (!joinList) {
    await recordContact({ ...contact, source: "checkout", tags }).catch((err) => {
      console.error("Couldn't record a checkout contact:", err);
    });
    return { ok: true };
  }

  const result = await subscribe({ ...contact, source: "checkout", tags }).catch((err) => {
    console.error("Checkout newsletter opt-in failed:", err);
    return { ok: false };
  });
  return { ok: result.ok };
}
