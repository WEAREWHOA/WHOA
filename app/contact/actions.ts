"use server";

import { submitContactMessage, type ContactMessageInput } from "@/lib/contact";

export async function submitContactAction(
  input: ContactMessageInput,
): Promise<{ ok: boolean; error?: string }> {
  return submitContactMessage(input);
}
