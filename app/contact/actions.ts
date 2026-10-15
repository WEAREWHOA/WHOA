"use server";

import { submitContactMessage, type ContactMessageInput } from "@/lib/contact";
import { HUMAN_CHECK_ERROR, verifyHuman, type HumanCheckInput } from "@/lib/humanCheck";

export async function submitContactAction(
  input: ContactMessageInput & HumanCheckInput,
): Promise<{ ok: boolean; error?: string }> {
  // First, and before the message is written anywhere. A contact form
  // is the single most reliably abused thing on a small site: it is
  // public, it takes free text, and every submission reaches a human
  // inbox.
  const human = await verifyHuman(input);
  if (!human.ok) {
    console.warn("submitContactAction rejected a submission:", human.reason);
    return { ok: false, error: HUMAN_CHECK_ERROR };
  }

  const { name, email, topic, message } = input;
  return submitContactMessage({ name, email, topic, message });
}
