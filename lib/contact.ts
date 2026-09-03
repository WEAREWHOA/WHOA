import { getSupabase } from "./supabase";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_TOPICS = ["Pricing", "Wholesale", "Custom design", "Events", "Something else"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactMessageInput {
  name: string;
  email: string;
  topic: string;
  message: string;
}

// No email service is wired up anywhere in this app — same posture as
// Custom Design's submission pipeline, this just stores the message for
// staff to read later rather than sending a notification. Public-facing,
// so it fails soft (returns an error string) rather than throwing.
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
    return { ok: true };
  } catch (err) {
    console.error("submitContactMessage failed:", err);
    return { ok: false, error: "Something went wrong on our end — try again in a moment." };
  }
}
