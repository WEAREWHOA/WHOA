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

// Stores the message, then notifies info@wearewhoa.com via Resend (see
// lib/email.ts). The notification is best-effort — the message is already
// safely stored by the time it's attempted, so an email hiccup here just
// gets logged, not surfaced to the visitor. Public-facing, so this fails
// soft (returns an error string) rather than throwing.
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

  try {
    const { error } = await getSupabase().from("contact_messages").insert({ name, email, topic, message });
    if (error) return { ok: false, error: error.message };

    try {
      await sendContactMessageNotification({ name, email, topic, message });
    } catch (emailErr) {
      console.error("sendContactMessageNotification failed:", emailErr);
    }

    return { ok: true };
  } catch (err) {
    console.error("submitContactMessage failed:", err);
    return { ok: false, error: "Something went wrong on our end — try again in a moment." };
  }
}
