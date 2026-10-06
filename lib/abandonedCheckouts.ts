import { cancelScheduledEmail, rescheduleEmail, sendAbandonedCheckoutEmail } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";
import type { CartLine } from "@/lib/types";

/**
 * The basket somebody filled in and walked away from.
 *
 * ───────────────────────────────────────────────────────────────────────
 * This is the first thing on the site that keeps a stranger's email
 * before they have bought anything, which is a real change in what we
 * collect rather than a technical detail. Two rules follow from it:
 *
 *   It is one reminder, never a sequence. A second and third email about
 *   a cart is the behaviour people associate with the shops they
 *   unsubscribe from, and it is the quickest way to make an address
 *   worth less than not having it.
 *
 *   Anyone who has unsubscribed is skipped. A cart reminder is arguably
 *   transactional, but somebody who has told us to stop has told us to
 *   stop, and winning that argument is not worth the complaint.
 * ───────────────────────────────────────────────────────────────────────
 *
 * The wait is Resend's. The reminder is scheduled an hour out when the
 * address is captured and pushed back on every keystroke-ish save, so
 * nobody is emailed while they are still filling the form in. Completing
 * an order cancels it outright.
 */

/** How long after they stop touching the form before the reminder goes. */
const REMINDER_DELAY_MINUTES = 60;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface CaptureInput {
  email: string;
  name?: string | null;
  lines: CartLine[];
  accountCode?: string | null;
}

interface Row {
  email: string;
  reminder_email_id: string | null;
  recovered_at: string | null;
}

/** Has this person told us to stop emailing them? */
async function hasOptedOut(email: string): Promise<boolean> {
  try {
    const { data } = await getSupabase()
      .from("newsletter_subscribers")
      .select("status")
      .eq("email", email)
      .maybeSingle();
    const status = (data as { status?: string } | null)?.status;
    // Anything other than an active subscriber is a no. A bounced address
    // cannot receive it anyway, and "never opted in" is a person who gave
    // us an address for something else entirely.
    return Boolean(status && status !== "subscribed");
  } catch {
    // The list being unreadable is not permission to email somebody.
    return true;
  }
}

/**
 * Remember the basket, and arrange the reminder.
 *
 * Called as somebody fills the checkout in, so it runs repeatedly for one
 * person. Each call pushes the send time back rather than scheduling a
 * second email.
 */
export async function captureCheckout(input: CaptureInput): Promise<{ captured: boolean }> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || input.lines.length === 0) return { captured: false };

  const supabase = getSupabase();
  const subtotalCents = input.lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const sendAt = new Date(Date.now() + REMINDER_DELAY_MINUTES * 60_000);

  const { data: existing } = await supabase
    .from("abandoned_checkouts")
    .select("email, reminder_email_id, recovered_at")
    .eq("email", email)
    .maybeSingle();
  const row = existing as Row | null;

  const { error } = await supabase.from("abandoned_checkouts").upsert(
    {
      email,
      customer_name: input.name?.trim() || null,
      lines: input.lines,
      subtotal_cents: subtotalCents,
      account_code: input.accountCode ?? null,
      // A returning customer starting a new basket is a live checkout
      // again, not a recovered one.
      recovered_at: null,
      reminder_scheduled_for: sendAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("Couldn't capture an abandoned checkout:", error.message);
    return { captured: false };
  }

  // Already has a reminder waiting: move it, don't make another.
  if (row?.reminder_email_id && !row.recovered_at) {
    await rescheduleEmail(row.reminder_email_id, sendAt.toISOString()).catch((err: unknown) =>
      console.error("Couldn't push back a checkout reminder:", err),
    );
    return { captured: true };
  }

  if (await hasOptedOut(email)) return { captured: true };

  try {
    const emailId = await sendAbandonedCheckoutEmail({
      to: email,
      customerName: input.name?.trim() || null,
      lines: input.lines,
      subtotalCents,
      scheduledAt: sendAt.toISOString(),
    });
    await supabase
      .from("abandoned_checkouts")
      .update({ reminder_email_id: emailId })
      .eq("email", email);
  } catch (err) {
    console.error("Couldn't schedule a checkout reminder:", err);
  }

  return { captured: true };
}

/**
 * They bought it. Cancel the reminder and close the row.
 *
 * Best effort on both halves: an order that completed must never fail
 * because a reminder could not be called off. If the cancel loses a race
 * with the send, the row is still marked recovered, which is what stops
 * it being counted as an open checkout.
 */
export async function markRecovered(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean) return;

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("abandoned_checkouts")
      .select("email, reminder_email_id, recovered_at")
      .eq("email", clean)
      .maybeSingle();
    const row = data as Row | null;
    if (!row || row.recovered_at) return;

    if (row.reminder_email_id) {
      await cancelScheduledEmail(row.reminder_email_id).catch((err: unknown) =>
        console.error("Couldn't cancel a checkout reminder:", err),
      );
    }

    await supabase
      .from("abandoned_checkouts")
      .update({ recovered_at: new Date().toISOString() })
      .eq("email", clean);
  } catch (err) {
    console.error("Couldn't mark a checkout recovered:", err);
  }
}
