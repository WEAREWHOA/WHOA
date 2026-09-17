import { getSupabase } from "./supabase";
import { sendContactMessageNotification } from "./email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_TOPICS = ["Pricing", "Wholesale", "Custom design", "Events", "Something else"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  message: string;
}

/**
 * Files the message two ways, independently: a row in contact_messages for
 * staff to browse later, and an email to info@wearewhoa.com (see
 * lib/email.ts) so a person actually hears about it.
 *
 * Neither one gates the other. The insert used to come first and decide
 * the outcome, so when the contact_messages table wasn't there the visitor
 * got a raw Postgres error — "Could not find the table
 * 'public.contact_messages' in the schema cache" — and the email was never
 * even attempted. A message someone took the trouble to write was lost
 * because of a bookkeeping table.
 *
 * The submission counts as delivered if either half worked. Only losing
 * both is a real failure, and then the visitor is told how to reach us
 * directly rather than being asked to retype it into the same form.
 *
 * Public-facing, so this fails soft (returns an error string) rather than
 * throwing.
 */
export async function submitContactMessage(
  input: ContactMessageInput,
): Promise<{ ok: boolean; error?: string }> {
  const name = input.name.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 200);
  const topic = input.topic.trim().slice(0, 50) || "Something else";
  const message = input.message.trim().slice(0, 4000);

  if (!name) return { ok: false, error: "Name is required." };
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Enter a valid email." };
  if (!message) return { ok: false, error: "Enter a message." };

  const stored = await storeContactMessage({ name, email, topic, message });

  let notified = false;
  try {
    await sendContactMessageNotification({ name, email, topic, message });
    notified = true;
  } catch (err) {
    console.error("sendContactMessageNotification failed:", err);
  }

  if (!stored && !notified) {
    return {
      ok: false,
      error: "We couldn't get that through — please email info@wearewhoa.com directly.",
    };
  }

  return { ok: true };
}

// Never surfaces its own error text: a visitor shouldn't be shown our
// schema, and there is nothing they could do about it anyway.
async function storeContactMessage(row: ContactMessageInput): Promise<boolean> {
  try {
    const { error } = await getSupabase().from("contact_messages").insert(row);
    if (error) {
      console.error("Failed to store contact message:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to store contact message:", err);
    return false;
  }
}
