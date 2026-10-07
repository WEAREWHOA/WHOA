import { Resend } from "resend";

import { sendWelcomeEmail } from "@/lib/email";
import { normalizePhone } from "@/lib/mailchimpImport";
import { getSupabase } from "@/lib/supabase";

/**
 * The newsletter list, and the contact record behind it.
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
 *
 * There are two ways in, and the difference between them is consent:
 *
 *   subscribe()      they asked to hear from us. Goes to Resend, gets a
 *                    welcome email, lands as `subscribed`.
 *
 *   recordContact()  they handed over an address for something else: an
 *                    RSVP, a contact form, a custom design quote. Never
 *                    reaches Resend, never gets an email, lands as
 *                    `never`. It exists so the Rolodex knows the person
 *                    is real, and so nobody has to guess later whether
 *                    an address was ever allowed to be mailed.
 *
 * Both tag. A tag is how a send gets aimed at one show's guests instead
 * of the whole list, so the tag has to be written at the moment we learn
 * the thing, not reconstructed afterwards from an orders table.
 * ───────────────────────────────────────────────────────────────────────
 */

/** Where a subscriber came from. Stored so a campaign can be aimed, and
 *  so a spike in signups can be traced to whatever caused it. */
export type SignupSource =
  | "events"
  | "footer"
  | "checkout"
  | "import"
  | "pos"
  | "rsvp"
  | "contact"
  | "custom-design"
  | "apply"
  | "vendor"
  | "review"
  | "experience";

export const SIGNUP_SOURCE_LABELS: Record<SignupSource, string> = {
  events: "Events page",
  footer: "Site footer",
  checkout: "Checkout",
  import: "Imported",
  pos: "POS register",
  rsvp: "Event RSVP",
  contact: "Contact form",
  "custom-design": "Custom design",
  apply: "Ambassador application",
  vendor: "Vendor application",
  review: "Product review",
  experience: "In-store experience",
};

/**
 * The tags written by the site itself, as opposed to the ones that came
 * out of Mailchimp. Named here rather than spelled out at each call site
 * so a rename is one edit and a typo can't quietly create a second,
 * nearly-identical segment.
 */
export const TAG = {
  events: "Events",
  eventNewsletter: "Event Newsletter",
  ticketBuyers: "Ticket Buyers",
  customers: "Customers",
  pos: "Bought In Store",
  contact: "Contact Form",
  customDesign: "Custom Design",
  reviewers: "Reviewers",
  ambassadors: "Ambassadors",
  vendors: "Vendors",
  experiences: "Experiences",
} as const;

/** The per-event tag: "Event: Pangaea Pop-Up". What makes a send to one
 *  show's guests possible. Capped, because a tag is a display name and an
 *  event title is not length-checked anywhere. */
export function eventTag(title: string): string {
  return `Event: ${title.trim()}`.slice(0, 80);
}

export interface SubscribeInput {
  email: string;
  firstName?: string;
  lastName?: string;
  /** As typed. Stored for the SMS side; never used to text anybody,
   *  since email consent is not consent to be texted. */
  phone?: string;
  source: SignupSource;
  tags?: string[];
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

  // A hard bounce or a spam complaint is the one thing a signup form must
  // not undo. Sending to an address that already bounced is how a sending
  // domain's reputation dies, and somebody typing their address into a
  // form is not evidence the mailbox came back. Thanked, not told —
  // whether we hold a complaint about an address is not a fact a public
  // form should hand out.
  const existing = await readMirrorRow(email);
  if (existing?.status === "cleaned") {
    console.error(`Newsletter: refused to resubscribe ${email}, locally marked cleaned.`);
    return { ok: true, alreadySubscribed: true };
  }

  let alreadySubscribed = false;
  try {
    const resend = getResend();
    const audienceId = getSegmentId();

    const contact = await resend.contacts.get({ email, audienceId }).catch(() => null);
    alreadySubscribed = Boolean(contact?.data?.id);

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
  await mirror({
    email,
    firstName,
    lastName,
    phone: input.phone,
    source: input.source,
    accountCode: input.accountCode,
    tags: input.tags ?? [],
    optedIn: true,
    existing,
  }).catch((err) => console.error("Newsletter: couldn't mirror the subscriber:", err));

  // Only for somebody who was not already on the list. Welcoming a
  // person for the second time reads as a shop that does not know who
  // its customers are, and an import of two thousand contacts would
  // otherwise welcome every one of them at once.
  if (!alreadySubscribed && input.source !== "import") {
    await sendWelcomeEmail({ to: email, firstName }).catch((err) =>
      console.error("Newsletter: couldn't send the welcome email:", err),
    );
  }

  return { ok: true, alreadySubscribed };
}

export interface RecordContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: SignupSource;
  tags?: string[];
  accountCode?: string;
}

/**
 * Remember somebody we now have an address for, WITHOUT subscribing them.
 *
 * Every public form that asks for an email goes through here: an RSVP, a
 * contact message, a custom design, a review, a vendor application. They
 * land as `never`, which the audience view reads as "we hold this address
 * and are not allowed to market to it" — a different thing from
 * unsubscribed, and the distinction is the whole point of the column.
 *
 * Two properties this has to hold, and both are about not losing ground:
 *
 *   An existing subscriber is never downgraded. Somebody on the list who
 *   RSVPs to a show gains the show's tag and keeps their status.
 *
 *   Somebody already recorded as `never` who later ticks an opt-in box is
 *   promoted by subscribe(), not by this.
 *
 * Silent on failure, and never awaited by anything the customer is
 * waiting on. A contact form must not fail because the Rolodex did.
 */
export async function recordContact(input: RecordContactInput): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) return;

  const existing = await readMirrorRow(email).catch(() => null);
  await mirror({
    email,
    firstName: input.firstName?.trim().slice(0, 100) || undefined,
    lastName: input.lastName?.trim().slice(0, 100) || undefined,
    phone: input.phone,
    source: input.source,
    accountCode: input.accountCode,
    tags: input.tags ?? [],
    optedIn: false,
    existing,
  });
}

/** Fire-and-forget recordContact, for the many call sites where the
 *  customer is waiting on something more important. */
export function recordContactInBackground(input: RecordContactInput): void {
  void recordContact(input).catch((err) =>
    console.error(`Couldn't record the contact ${input.email} from ${input.source}:`, err),
  );
}

/* ------------------------------------------------------------------ */
/* The mirror                                                          */
/* ------------------------------------------------------------------ */

/**
 * Columns added by the EMAIL/TEXT migration (0040). Dropped one at a
 * time if the migration has not been run yet, because Postgres rejects a
 * write naming an unknown column outright and losing a subscriber over a
 * column is worse than losing a flag on them.
 *
 * A loop rather than one retry: Postgres reports only the FIRST unknown
 * column, so with two columns outstanding a single retry fails on the
 * second and the error escapes.
 */
const OPTIONAL_MIRROR_COLUMNS = [
  "tags",
  "status",
  "optin_recorded",
  "phone_e164",
  "phone",
  "updated_at",
] as const;

const missingMirrorColumns = new Set<string>();

function unknownMirrorColumns(error: { code?: string; message?: string } | null): string[] | null {
  if (!error) return null;
  const message = error.message ?? "";
  const unknownColumn = error.code === "42703" || /column .* does not exist/i.test(message);
  if (!unknownColumn) return null;
  const named = OPTIONAL_MIRROR_COLUMNS.filter(
    (column) => !missingMirrorColumns.has(column) && message.includes(column),
  );
  // An unknown column we cannot name is not something to retry around:
  // dropping fields at random until the write happens would write a row
  // nobody asked for.
  return named.length > 0 ? named : null;
}

interface MirrorRow {
  status: string | null;
  tags: string[] | null;
  phone: string | null;
}

async function readMirrorRow(email: string): Promise<MirrorRow | null> {
  for (let attempt = 0; attempt <= OPTIONAL_MIRROR_COLUMNS.length; attempt++) {
    const columns = ["status", "tags", "phone"].filter((c) => !missingMirrorColumns.has(c));
    const { data, error } = await getSupabase()
      .from("newsletter_subscribers")
      .select(columns.length > 0 ? columns.join(", ") : "email")
      .eq("email", email)
      .maybeSingle();
    if (!error) {
      if (!data) return null;
      const row = data as Partial<MirrorRow>;
      return { status: row.status ?? null, tags: row.tags ?? null, phone: row.phone ?? null };
    }
    const dropping = unknownMirrorColumns(error);
    if (!dropping) {
      console.error(`Newsletter: couldn't read the mirror row for ${email}:`, error);
      return null;
    }
    for (const column of dropping) missingMirrorColumns.add(column);
  }
  return null;
}

function withoutMissing(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!missingMirrorColumns.has(key)) out[key] = value;
  }
  return out;
}

async function mirror(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  source: SignupSource;
  accountCode?: string;
  tags: string[];
  optedIn: boolean;
  existing: MirrorRow | null;
}): Promise<void> {
  // An address already in the table keeps its source and its name. Where
  // someone FIRST came from is the useful fact, and overwriting it would
  // make every subscriber look like they arrived from wherever they last
  // filled in a form. Only the tags grow, and only the status can be
  // promoted.
  if (input.existing) {
    // The one status change allowed here, and only upward: somebody
    // recorded as `never` for an RSVP who later ticks a signup box has
    // now actually asked, so the row has to stop saying they did not.
    // Without this, the order in which the forms happen to run decides
    // whether a real opt-in is honoured, which is not a thing that should
    // depend on luck.
    //
    // `unsubscribed` and `cleaned` are untouchable: one asked us to stop,
    // the other bounced.
    const promote = input.optedIn && (input.existing.status ?? "never") === "never";
    // Only fill a gap, never overwrite. A number that came over from
    // Mailchimp with a record of SMS consent attached to it must not be
    // replaced by a typo at a booth, and somebody changing their number
    // is a thing staff do in the Rolodex, not something a public form
    // gets to decide.
    const fillPhone = input.existing.phone ? undefined : input.phone;
    await mergeTags(input.email, input.existing.tags ?? [], input.tags, fillPhone, promote);
    return;
  }

  const row = withoutMissing({
    email: input.email,
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    phone: input.phone?.trim().slice(0, 30) || null,
    // The dialable form, or null where the number could not be made sense
    // of. Everything on the SMS side keys off this one rather than the
    // typed string, so a number that never normalises is simply never
    // texted. Writing it here is NOT consent to text: sms_consent stays
    // false until something records a basis for it.
    phone_e164: normalizePhone(input.phone),
    source: input.source,
    account_code: input.accountCode ?? null,
    tags: dedupeTags(input.tags),
    // An address given for an RSVP or a contact form is held, not
    // mailable. `never` is what the audience view reads to keep them out
    // of every send, and it is not the same as unsubscribed: they never
    // asked us to stop, they never asked us to start.
    status: input.optedIn ? "subscribed" : "never",
    // Somebody filling in a signup form IS the opt-in record, and it is
    // the one fact no later import can reconstruct: a CSV can tell you
    // an address was on a list, never that its owner asked to be.
    optin_recorded: input.optedIn,
  });

  const { error } = await getSupabase()
    .from("newsletter_subscribers")
    // ignoreDuplicates because two tabs, or a retry, must not race into
    // a conflict the customer sees. The row existing already is the
    // outcome we wanted.
    .upsert(row, { onConflict: "email", ignoreDuplicates: true });

  if (!error) return;

  const dropping = unknownMirrorColumns(error);
  if (!dropping) throw new Error(error.message);
  for (const column of dropping) missingMirrorColumns.add(column);
  console.error(
    `Newsletter: newsletter_subscribers is missing ${dropping.join(", ")} — run the EMAIL/TEXT ` +
      "migration (0040). Writing the subscriber without those fields.",
  );
  return mirror(input);
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Map<string, string>();
  for (const raw of tags) {
    const tag = raw.trim().slice(0, 80);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (!seen.has(key)) seen.set(key, tag);
  }
  return [...seen.values()];
}

/**
 * Add tags to a row that already exists, case-insensitively, and fill in
 * a phone number if we have one and the row doesn't.
 *
 * Read-then-write rather than a Postgres array union, because the union
 * operator needs raw SQL the Supabase client can't express without an
 * RPC. The race (two forms tagging the same person in the same instant)
 * costs one tag, which is not worth a database function.
 */
async function mergeTags(
  email: string,
  current: string[],
  adding: string[],
  phone?: string,
  promote = false,
): Promise<void> {
  const merged = dedupeTags([...current, ...adding]);
  const tagsChanged = merged.length !== dedupeTags(current).length;

  const patch = withoutMissing({
    ...(tagsChanged ? { tags: merged } : {}),
    ...(phone ? { phone: phone.trim().slice(0, 30), phone_e164: normalizePhone(phone) } : {}),
    ...(promote ? { status: "subscribed", optin_recorded: true } : {}),
    updated_at: new Date().toISOString(),
  });
  // updated_at alone is not worth a write.
  const meaningful = Object.keys(patch).some((key) => key !== "updated_at");
  if (!meaningful) return;

  const { error } = await getSupabase()
    .from("newsletter_subscribers")
    .update(patch)
    .eq("email", email);

  if (!error) return;
  const dropping = unknownMirrorColumns(error);
  if (!dropping) throw new Error(error.message);
  for (const column of dropping) missingMirrorColumns.add(column);
  return mergeTags(email, current, adding, phone, promote);
}

/**
 * Reading the list lives in lib/audience.ts, with the tags, phone
 * numbers and statuses the EMAIL/TEXT tab needs. This module is the
 * write side: the signup forms, and nothing else.
 */
