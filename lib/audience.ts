import { Resend } from "resend";

import { finalTags, type ContactStatus, type ImportPlan, type PlannedContact } from "@/lib/mailchimpImport";
import { getSupabase } from "@/lib/supabase";

/**
 * The audience behind the EMAIL/TEXT tab.
 *
 * Two stores, each owning what only it can know:
 *
 *   Resend   whether a contact it holds is still subscribed. Its
 *            broadcasts carry the unsubscribe link, and clicking it
 *            flips the flag there without telling us.
 *   us       everything Resend has no concept of: tags, phone numbers,
 *            the Square customer behind the address, where someone came
 *            from, and the people we deliberately never put in Resend
 *            because they bounced or never opted in.
 *
 * Reads merge the two. Writes go to whichever one owns that fact.
 */

export const RESEND_IMPORT_CHUNK = 500;

export interface AudienceContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneE164: string | null;
  squareCustomerId: string | null;
  accountCode: string | null;
  tags: string[];
  status: ContactStatus;
  source: string | null;
  optinRecorded: boolean;
  smsConsent: boolean;
  createdAt: string | null;
  /** From Resend where it holds this contact, else from our status. */
  unsubscribed: boolean;
}

export interface AudienceTag {
  tag: string;
  count: number;
  /** How many of them could actually be mailed. */
  mailable: number;
}

export interface Audience {
  contacts: AudienceContact[];
  tags: AudienceTag[];
  counts: Record<ContactStatus, number>;
  total: number;
  mailable: number;
  textable: number;
  /** Mailable, but with no record of them ever opting in. */
  noOptinRecord: number;
  resendError: string | null;
  configured: boolean;
  /** True when migration 0040 has not been run yet. */
  needsMigration: boolean;
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  return new Resend(key);
}

function getSegmentId(): string {
  const id = process.env.RESEND_AUDIENCE_ID;
  if (!id) throw new Error("Missing Resend env var: RESEND_AUDIENCE_ID is required.");
  return id;
}

export function isConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID);
}

/**
 * The address a campaign is sent from.
 *
 * Must be on a domain verified in Resend, which is wearewhoa.art: the
 * one the order emails already go out on. An address on an unverified
 * domain is rejected when the send happens, not when it is typed, which
 * is the worst moment to find out.
 *
 * info@ rather than orders@ on purpose. Transactional and marketing mail
 * build separate reputations, and a campaign that collects complaints
 * should not be able to stop a receipt arriving.
 *
 * It is a real mailbox: wearewhoa.art is a user alias domain on the
 * Google Workspace behind wearewhoa.com, so mail to it lands in the
 * inbox that is already read. That matters because people reply to
 * marketing email, and some of them ignore the reply-to header and
 * write to the sender instead.
 */
export function marketingFrom(): string {
  return process.env.RESEND_FROM || "WHOA <info@wearewhoa.art>";
}

/**
 * Where a reply lands.
 *
 * People do reply to marketing email, and the sending address is on a
 * domain picked for deliverability rather than for being read. This is
 * the inbox somebody actually opens, and it does not have to be on a
 * verified domain: reply-to is a header, not a sender.
 */
export function marketingReplyTo(): string {
  return process.env.RESEND_REPLY_TO || "info@wearewhoa.com";
}

interface Row {
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_e164: string | null;
  square_customer_id: string | null;
  account_code: string | null;
  tags: string[] | null;
  status: ContactStatus | null;
  source: string | null;
  optin_recorded: boolean | null;
  sms_consent: boolean | null;
  created_at: string | null;
}

// Same trick as the account lookup: a select naming a column the
// database does not have yet is rejected whole, and this one runs the
// moment somebody opens the tab. Asked for optimistically, dropped on
// the error that says the migration has not been run.
const BASE_COLUMNS = "email, first_name, last_name, source, account_code, created_at";
const EXTENDED_COLUMNS =
  "phone, phone_e164, square_customer_id, tags, status, optin_recorded, sms_consent";

let missingExtended = false;

async function readMirror(): Promise<{ rows: Row[]; needsMigration: boolean }> {
  const supabase = getSupabase();
  const select = missingExtended ? BASE_COLUMNS : `${BASE_COLUMNS}, ${EXTENDED_COLUMNS}`;

  const { data, error } = await supabase.from("newsletter_subscribers").select(select).limit(20000);

  if (error) {
    const unknownColumn = error.code === "42703" || /column .* does not exist/i.test(error.message);
    if (unknownColumn && !missingExtended) {
      console.error(
        "newsletter_subscribers is missing the EMAIL/TEXT columns, so tags, phones and status " +
          "will read as empty until migration 0040 has been run. The tab still loads.",
      );
      missingExtended = true;
      return readMirror();
    }
    console.error("Audience: couldn't read the contact table:", error.message);
    return { rows: [], needsMigration: missingExtended };
  }

  return { rows: (data ?? []) as unknown as Row[], needsMigration: missingExtended };
}

export async function getAudience(): Promise<Audience> {
  const empty: Audience = {
    contacts: [],
    tags: [],
    counts: { subscribed: 0, unsubscribed: 0, cleaned: 0, never: 0 },
    total: 0,
    mailable: 0,
    textable: 0,
    noOptinRecord: 0,
    resendError: null,
    configured: isConfigured(),
    needsMigration: false,
  };
  if (!empty.configured) return empty;

  const [{ rows, needsMigration }, resendResult] = await Promise.all([
    readMirror(),
    getResend()
      .contacts.list({ audienceId: getSegmentId() })
      .catch((err) => {
        console.error("Audience: couldn't list Resend contacts:", err);
        return null;
      }),
  ]);

  const resendContacts = resendResult?.data?.data ?? [];
  const resendByEmail = new Map(
    resendContacts
      .filter((c) => c.email)
      .map((c) => [c.email.toLowerCase(), c] as const),
  );

  const contacts: AudienceContact[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const email = row.email.toLowerCase();
    seen.add(email);
    const remote = resendByEmail.get(email);
    const status = row.status ?? "subscribed";
    contacts.push({
      email,
      firstName: remote?.first_name || row.first_name,
      lastName: remote?.last_name || row.last_name,
      phone: row.phone ?? null,
      phoneE164: row.phone_e164 ?? null,
      squareCustomerId: row.square_customer_id ?? null,
      accountCode: row.account_code,
      tags: row.tags ?? [],
      status,
      source: row.source,
      optinRecorded: row.optin_recorded ?? false,
      smsConsent: row.sms_consent ?? false,
      createdAt: row.created_at,
      // Resend's answer wins where it has one, because its unsubscribe
      // link is the one people actually click.
      unsubscribed: remote ? Boolean(remote.unsubscribed) : status !== "subscribed",
    });
  }

  // In Resend but not in our table: a signup that reached Resend and
  // never reached us. Shown rather than hidden, because it is a real
  // problem somebody should see.
  for (const remote of resendContacts) {
    const email = (remote.email ?? "").toLowerCase();
    if (!email || seen.has(email)) continue;
    contacts.push({
      email,
      firstName: remote.first_name,
      lastName: remote.last_name,
      phone: null,
      phoneE164: null,
      squareCustomerId: null,
      accountCode: null,
      tags: [],
      status: remote.unsubscribed ? "unsubscribed" : "subscribed",
      source: null,
      optinRecorded: false,
      smsConsent: false,
      createdAt: remote.created_at ?? null,
      unsubscribed: Boolean(remote.unsubscribed),
    });
  }

  contacts.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

  const counts: Record<ContactStatus, number> = {
    subscribed: 0,
    unsubscribed: 0,
    cleaned: 0,
    never: 0,
  };
  const tagMap = new Map<string, { count: number; mailable: number }>();

  for (const contact of contacts) {
    counts[contact.status]++;
    const mailable = contact.status === "subscribed" && !contact.unsubscribed;
    for (const tag of contact.tags) {
      const entry = tagMap.get(tag) ?? { count: 0, mailable: 0 };
      entry.count++;
      if (mailable) entry.mailable++;
      tagMap.set(tag, entry);
    }
  }

  const mailableContacts = contacts.filter((c) => c.status === "subscribed" && !c.unsubscribed);

  return {
    contacts,
    tags: [...tagMap.entries()]
      .map(([tag, v]) => ({ tag, ...v }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    counts,
    total: contacts.length,
    mailable: mailableContacts.length,
    // Consent, not possession. Having somebody's number is not permission
    // to text it.
    textable: contacts.filter((c) => c.phoneE164 && c.smsConsent && c.status !== "cleaned").length,
    noOptinRecord: mailableContacts.filter((c) => !c.optinRecorded).length,
    resendError: resendResult
      ? null
      : "Resend couldn't be reached, so subscribe status may be out of date.",
    configured: true,
    needsMigration,
  };
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

export interface ApplyResult {
  ok: boolean;
  storedLocally: number;
  sentToResend: number;
  resendImportId: string | null;
  error?: string;
  warnings: string[];
}

function csvCell(value: string | null | undefined): string {
  const text = value ?? "";
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * The CSV handed to Resend.
 *
 * Only the people Resend should ever hold: those who are subscribed, and
 * those who unsubscribed. The second group goes over marked unsubscribed
 * so Resend knows to refuse them, rather than being left out and
 * re-added innocently by the next signup form.
 *
 * Bounced addresses and people who never opted in are not in this file at
 * all. Uploading a hard-bounced address is how a sending reputation dies.
 */
export function buildResendCsv(contacts: PlannedContact[]): string {
  const lines = ["email,first_name,last_name,unsubscribed"];
  for (const contact of contacts) {
    if (contact.status !== "subscribed" && contact.status !== "unsubscribed") continue;
    lines.push(
      [
        csvCell(contact.email),
        csvCell(contact.firstName),
        csvCell(contact.lastName),
        contact.status === "unsubscribed" ? "true" : "false",
      ].join(","),
    );
  }
  return lines.join("\n");
}

/**
 * Write the plan.
 *
 * Our table first, and in chunks, because it is the record of what was
 * decided about each person: if the Resend half fails, the decisions
 * survive and the upload can be retried. Resend second, as one bulk
 * import rather than two thousand calls, which is both faster and the
 * only version that fits inside a serverless request.
 */
export async function applyImportPlan(plan: ImportPlan): Promise<ApplyResult> {
  const warnings: string[] = [];
  const supabase = getSupabase();
  let storedLocally = 0;

  const rows = plan.contacts.map((contact) => ({
    email: contact.email,
    first_name: contact.firstName,
    last_name: contact.lastName,
    phone: contact.phone,
    phone_e164: contact.phoneE164,
    square_customer_id: contact.squareCustomerId,
    tags: finalTags(contact),
    status: contact.status,
    unsubscribed_at: contact.unsubscribedAt,
    unsub_reason: contact.unsubReason,
    optin_recorded: contact.optinRecorded,
    sms_consent: contact.smsConsent,
    sms_consent_source: contact.smsConsentSource,
    sms_consent_at: contact.smsConsent ? new Date().toISOString() : null,
    source: "import",
    imported_from: contact.importedFrom,
    updated_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += RESEND_IMPORT_CHUNK) {
    const chunk = rows.slice(i, i + RESEND_IMPORT_CHUNK);
    // Overwrite on conflict: this import is a correction, and the whole
    // point is that somebody's status and tags end up matching what
    // Mailchimp actually recorded.
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(chunk, { onConflict: "email" });
    if (error) {
      return {
        ok: false,
        storedLocally,
        sentToResend: 0,
        resendImportId: null,
        error: `Couldn't save the contacts: ${error.message}`,
        warnings,
      };
    }
    storedLocally += chunk.length;
  }

  const csv = buildResendCsv(plan.contacts);
  const sentToResend = csv.split("\n").length - 1;
  let resendImportId: string | null = null;

  try {
    const result = await getResend().contacts.imports.create({
      file: new Blob([csv], { type: "text/csv" }),
      columnMap: {
        email: "email",
        firstName: "first_name",
        lastName: "last_name",
        unsubscribed: "unsubscribed",
      },
      // The import is the correction, so it wins over what is already
      // there. An address Mailchimp says unsubscribed must end up
      // unsubscribed in Resend even if a form added it before.
      onConflict: "upsert",
      segments: [{ id: getSegmentId() }],
    });
    if (result.error) throw new Error(result.error.message);
    resendImportId = result.data?.id ?? null;
  } catch (err) {
    warnings.push(
      `Contacts were saved here, but the upload to Resend failed: ${
        err instanceof Error ? err.message : String(err)
      }. Nothing was lost; run the import again.`,
    );
    return { ok: false, storedLocally, sentToResend: 0, resendImportId: null, warnings };
  }

  return { ok: true, storedLocally, sentToResend, resendImportId, warnings };
}

/** How a running Resend import is getting on. */
export async function getImportStatus(id: string) {
  const result = await getResend().contacts.imports.get(id);
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/** The audience as a CSV, for a spreadsheet or another tool. */
export function audienceCsv(contacts: AudienceContact[]): string {
  const header = [
    "email", "first_name", "last_name", "phone", "status",
    "tags", "source", "square_customer_id", "opt_in_recorded", "sms_consent", "created_at",
  ];
  const lines = [header.join(",")];
  for (const c of contacts) {
    lines.push([
      csvCell(c.email), csvCell(c.firstName), csvCell(c.lastName), csvCell(c.phoneE164),
      csvCell(c.unsubscribed && c.status === "subscribed" ? "unsubscribed" : c.status),
      csvCell(c.tags.join("; ")), csvCell(c.source), csvCell(c.squareCustomerId),
      c.optinRecorded ? "yes" : "no", c.smsConsent ? "yes" : "no", csvCell(c.createdAt),
    ].join(","));
  }
  return lines.join("\n");
}
