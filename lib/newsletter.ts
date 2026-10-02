import { Resend } from "resend";

import { getSupabase } from "@/lib/supabase";

/**
 * The newsletter list.
 *
 * ───────────────────────────────────────────────────────────────────────
 * Resend owns whether someone is subscribed. We mirror it; we don't
 * decide it.
 *
 * Every broadcast Resend sends carries its own unsubscribe link, and
 * clicking it flips `unsubscribed` on Resend's contact record without
 * telling us. If our table were the source of truth, we'd email someone
 * who had already opted out, which is a CAN-SPAM violation rather than a
 * bug. So Resend is asked on every write, and the mirror below exists to
 * make the portal searchable and to remember where each person came
 * from — two things Resend's contact record can't tell us.
 * ───────────────────────────────────────────────────────────────────────
 */

/** Where a subscriber came from. Stored so a campaign can be aimed, and
 *  so a spike in signups can be traced to whatever caused it. */
export type SignupSource = "events" | "footer" | "checkout" | "import" | "pos";

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  events: "Events page",
  footer: "Site footer",
  checkout: "Checkout",
  import: "Imported",
  pos: "POS register",
};

export interface SubscribeInput {
  email: string;
  firstName?: string;
  lastName?: string;
  source: SignupSource;
  /** The WHOA account this came from, when there is one. */
  accountCode?: string;
}

export interface SubscribeResult {
  ok: boolean;
  error?: string;
  /** True when they were already on the list. Not a failure: the signup
   *  form should thank them either way rather than leak who's subscribed. */
  alreadySubscribed?: boolean;
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  }
  return new Resend(key);
}

/**
 * The Resend segment (what the API used to call an audience) holding the
 * newsletter list.
 *
 * An explicit id rather than a lookup by name: segments can be renamed in
 * Resend's dashboard, and a rename silently creating a second, empty list
 * is the kind of failure nobody notices until a campaign goes to nineteen
 * people.
 */
function getSegmentId(): string {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) {
    throw new Error("Missing Resend env var: RESEND_AUDIENCE_ID is required for the newsletter.");
  }
  return id;
}

export function isNewsletterConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID);
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, 200);
}

/**
 * Add someone to the list.
 *
 * Deliberately NOT an upsert of subscription state: `unsubscribed` is
 * never sent, so re-submitting the form can't resubscribe somebody who
 * opted out. Resend treats a repeat create as a no-op on an existing
 * contact, which is exactly the behaviour wanted here.
 */
export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const firstName = input.firstName?.trim().slice(0, 100) || undefined;
  const lastName = input.lastName?.trim().slice(0, 100) || undefined;

  let alreadySubscribed = false;
  try {
    const resend = getResend();
    const audienceId = getSegmentId();

    const existing = await resend.contacts
      .get({ email, audienceId })
      .catch(() => null);
    alreadySubscribed = Boolean(existing?.data?.id);

    if (!alreadySubscribed) {
      const created = await resend.contacts.create({ audienceId, email, firstName, lastName });
      if (created.error) {
        console.error("Newsletter: Resend rejected the contact:", created.error);
        return { ok: false, error: "Couldn't sign you up. Please try again." };
      }
    }
  } catch (err) {
    console.error("Newsletter: subscribe failed:", err);
    return { ok: false, error: "Newsletter signup isn't available right now. Please try again later." };
  }

  // The mirror is best-effort on purpose. Someone is subscribed the
  // moment Resend says so; failing the signup because our own reporting
  // table hiccuped would turn a bookkeeping problem into a lost
  // subscriber.
  await mirror({ email, firstName, lastName, source: input.source, accountCode: input.accountCode }).catch(
    (err) => console.error("Newsletter: couldn't mirror the subscriber:", err),
  );

  return { ok: true, alreadySubscribed };
}

// Set once, if the EMAIL/TEXT migration has not been run yet. Same
// reasoning as the account lookup: a column that does not exist yet
// rejects the whole write, and losing a subscriber over a column is a
// worse outcome than losing one flag on them.
let optinColumnMissing = false;

async function mirror(row: {
  email: string;
  firstName?: string;
  lastName?: string;
  source: SignupSource;
  accountCode?: string;
}): Promise<void> {
  const { error } = await getSupabase()
    .from("newsletter_subscribers")
    .upsert(
      {
        email: row.email,
        first_name: row.firstName ?? null,
        last_name: row.lastName ?? null,
        source: row.source,
        account_code: row.accountCode ?? null,
        // Somebody filling in a form IS the opt-in record, and it is the
        // one fact no later import can reconstruct: a CSV can tell you
        // an address was on a list, never that its owner asked to be.
        ...(optinColumnMissing ? {} : { optin_recorded: true }),
      },
      // Keep the ORIGINAL source on a repeat signup: where someone first
      // came from is the useful fact, and overwriting it would make every
      // subscriber look like they arrived from wherever they last filled
      // in a form.
      { onConflict: "email", ignoreDuplicates: true },
    );
  if (error) {
    const unknownColumn = error.code === "42703" || /column .* does not exist/i.test(error.message);
    if (unknownColumn && !optinColumnMissing) {
      optinColumnMissing = true;
      return mirror(row);
    }
    throw new Error(error.message);
  }
}

/**
 * Reading the list lives in lib/audience.ts now, with the tags, phone
 * numbers and statuses the EMAIL/TEXT tab needs. This module is the
 * write side: the signup forms, and nothing else.
 */
