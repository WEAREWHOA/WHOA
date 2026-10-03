/**
 * Bringing the Mailchimp list over.
 *
 * Mailchimp exports an audience as four files, and which file somebody is
 * in IS the consent record:
 *
 *   subscribed     asked for marketing, still wants it
 *   unsubscribed   asked us to stop
 *   cleaned        hard bounced or marked us as spam
 *   nonsubscribed  gave an address for something else and never opted in
 *
 * Importing all four as "subscribers" is the single most common way a
 * sending domain gets destroyed, so this keeps the four apart and only
 * the first group is ever mailable. The other three are still stored,
 * because the alternative is re-importing them by accident the next time
 * somebody exports a list.
 *
 * Everything up to applyImport is pure: text in, a plan out. The plan can
 * be read, counted and argued with before anything is written.
 */

export type ContactStatus = "subscribed" | "unsubscribed" | "cleaned" | "never";

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  cleaned: "Bounced / spam",
  never: "Never opted in",
};

/** Mailchimp writes one of these per export. */
export type MailchimpFileKind = ContactStatus | "unknown";

/**
 * Tags Mailchimp generates for its own bookkeeping. They say when a CSV
 * was uploaded, which is not a thing anybody wants to segment on, and
 * they would be the two largest "segments" in the account.
 */
const NOISE_TAG = /^contact import\b/i;

/** The tag Square uses for people who agreed to be texted. */
const SMS_TAG = /^text subscribers?$/i;

export interface PlannedContact {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneE164: string | null;
  squareCustomerId: string | null;
  tags: string[];
  status: ContactStatus;
  unsubscribedAt: string | null;
  unsubReason: string | null;
  optinRecorded: boolean;
  smsConsent: boolean;
  /** In words: how we know. Null when there is no consent to explain. */
  smsConsentSource: string | null;
  createdAt: string | null;
  importedFrom: string;
  /** Why this row's status is not simply the file it came from. */
  note?: string;
}

export interface ImportFileSummary {
  name: string;
  kind: MailchimpFileKind;
  rows: number;
  skipped: number;
}

export interface ImportPlan {
  contacts: PlannedContact[];
  files: ImportFileSummary[];
  counts: Record<ContactStatus, number>;
  /** Addresses that appeared in more than one file. */
  duplicates: string[];
  /** Tags found, with how many contacts carry each. */
  tags: { tag: string; count: number }[];
  mailable: number;
  withPhone: number;
  smsConsenting: number;
  /** Mailable contacts with no record of them actually opting in. */
  noOptinRecord: number;
  warnings: string[];
}

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/**
 * A CSV reader, rather than a split on commas.
 *
 * These files have commas inside quoted addresses and quoted tag lists,
 * and newlines inside quoted notes. Splitting on commas turns one
 * contact into three malformed ones, silently.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  // Strip a UTF-8 BOM, which Excel adds and which would otherwise become
  // part of the first column's name.
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function toRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => {
      record[key] = (cells[i] ?? "").trim();
    });
    return record;
  });
}

/* ------------------------------------------------------------------ */
/* Field normalising                                                   */
/* ------------------------------------------------------------------ */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Which of the four exports this is.
 *
 * The name first, because Mailchimp's subscribed and nonsubscribed
 * exports have identical columns and nothing inside them tells the two
 * apart. "nonsubscribed" is tested before "subscribed" for the obvious
 * reason that the second is a substring of the first.
 */
export function detectFileKind(filename: string, header: string[]): MailchimpFileKind {
  const name = filename.toLowerCase();
  if (name.includes("nonsubscribed")) return "never";
  if (name.includes("unsubscribed")) return "unsubscribed";
  if (name.includes("cleaned")) return "cleaned";
  if (name.includes("subscribed")) return "subscribed";

  // Renamed file: fall back to the columns only Mailchimp's unsubscribed
  // and cleaned exports carry.
  if (header.includes("UNSUB_TIME")) return "unsubscribed";
  if (header.includes("CLEAN_TIME")) return "cleaned";
  return "unknown";
}

/**
 * A phone number as E.164, or null.
 *
 * Null rather than a guess. These arrive as 6193058111, '+16193058111
 * (Excel's apostrophe, to stop it eating the plus) and 619-305-8111, and
 * a number that cannot be read confidently is worse than no number: it
 * is a text message to a stranger.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/^'/, "").trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hasPlus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  // Bare digits are assumed North American, which is where every WHOA
  // address in this export is. 10 digits, or 11 starting with a 1.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/** Mailchimp writes TAGS as a comma separated list of quoted names. */
export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const quoted = [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  const parts = quoted.length > 0 ? quoted : raw.split(",");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of parts) {
    const tag = part.trim();
    if (!tag || NOISE_TAG.test(tag)) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

/**
 * Whether there is a real record of this person opting in.
 *
 * Mailchimp writes 127.0.0.1 as the opt-in IP for everyone brought in by
 * a bulk upload, because nobody clicked anything: the address was in a
 * file. That is a materially different thing from a signup, and it is
 * the fact worth keeping when a complaint arrives.
 */
function hasOptinRecord(row: Record<string, string>): boolean {
  const ip = (row.OPTIN_IP || "").trim();
  if (!ip || ip === "127.0.0.1" || ip === "0.0.0.0") return false;
  return Boolean((row.OPTIN_TIME || "").trim());
}

function isoDate(value: string | undefined): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw.includes("T") ? raw : raw.replace(" ", "T") + "Z");
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/* ------------------------------------------------------------------ */
/* Planning                                                            */
/* ------------------------------------------------------------------ */

export interface ImportFileInput {
  name: string;
  text: string;
  /** Overrides what the filename says, for a renamed export. */
  kind?: MailchimpFileKind;
}

export interface ImportOptions {
  /**
   * Mark everyone mailable with a usable number as having agreed to be
   * texted.
   *
   * Only ever set by somebody ticking the box in the import screen, and
   * only they can know whether it is true: the export itself carries no
   * record of SMS consent beyond one "Text Subscribers" tag, so there is
   * nothing here to infer it from.
   *
   * It applies to subscribed contacts only. Somebody who asked to stop
   * getting email, who bounced, or who never opted in to anything has
   * not been included in whatever was agreed.
   */
  smsConsentForAll?: boolean;
  /** What to record as the basis. Shown in the audit trail. */
  smsConsentSource?: string;
}

export const DEFAULT_SMS_CONSENT_SOURCE =
  "Asserted at import: collected with the email signup";

/**
 * Read the files and work out what would be written. Writes nothing.
 */
export function planImport(files: ImportFileInput[], options: ImportOptions = {}): ImportPlan {
  const byEmail = new Map<string, PlannedContact>();
  const duplicates = new Set<string>();
  const summaries: ImportFileSummary[] = [];
  const warnings: string[] = [];

  for (const file of files) {
    const records = toRecords(file.text);
    const header = records.length > 0 ? Object.keys(records[0]) : [];
    const kind = file.kind ?? detectFileKind(file.name, header);

    if (kind === "unknown") {
      warnings.push(
        `${file.name}: couldn't tell which export this is, so it was skipped. Rename it to include subscribed, unsubscribed, nonsubscribed or cleaned.`,
      );
      summaries.push({ name: file.name, kind, rows: 0, skipped: records.length });
      continue;
    }

    let skipped = 0;

    for (const row of records) {
      const email = (row["Email Address"] || "").trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) {
        skipped++;
        continue;
      }

      const tags = parseTags(row.TAGS);
      const squareStatus = (row["Email subscriber status"] || "").trim();
      const unsubReason = (row.UNSUB_REASON || "").trim() || null;

      let status: ContactStatus = kind;
      let note: string | undefined;

      // Somebody who reported a campaign as spam is never contacted
      // again, whatever any other column says. A complaint is the single
      // most expensive thing a sender can collect.
      if (unsubReason === "SPAM") {
        status = "cleaned";
        note = "Marked a campaign as spam";
      } else if (status === "subscribed" && squareStatus === "Unsubscribed") {
        // The two systems disagree. The one saying stop wins: being
        // wrongly left off a newsletter costs nothing, being wrongly on
        // it is the complaint.
        status = "unsubscribed";
        note = "Square has them as unsubscribed";
      }

      const phone = (row["Phone Number"] || "").trim() || null;
      const planned: PlannedContact = {
        email,
        firstName: (row["First Name"] || "").trim() || null,
        lastName: (row["Last Name"] || "").trim() || null,
        phone,
        phoneE164: normalizePhone(phone),
        squareCustomerId: (row["Square Customer ID"] || "").trim() || null,
        tags,
        status,
        unsubscribedAt: isoDate(row.UNSUB_TIME) ?? isoDate(row.CLEAN_TIME),
        unsubReason,
        optinRecorded: hasOptinRecord(row),
        smsConsent: tags.some((t) => SMS_TAG.test(t)),
        smsConsentSource: tags.some((t) => SMS_TAG.test(t))
          ? 'Tagged "Text Subscribers" in Mailchimp'
          : null,
        createdAt: isoDate(row["Created At (UTC+0)"]) ?? isoDate(row.OPTIN_TIME),
        importedFrom: file.name,
        note,
      };

      const existing = byEmail.get(email);
      if (existing) {
        duplicates.add(email);
        // Keep whichever record is the more restrictive: one file saying
        // subscribed does not undo another saying bounced.
        byEmail.set(email, mergeContacts(existing, planned));
      } else {
        byEmail.set(email, planned);
      }
    }

    summaries.push({ name: file.name, kind, rows: records.length - skipped, skipped });
  }

  const contacts = [...byEmail.values()];

  if (options.smsConsentForAll) {
    const source = options.smsConsentSource?.trim() || DEFAULT_SMS_CONSENT_SOURCE;
    for (const contact of contacts) {
      // A number we could not read is not a number we can text, and a
      // status other than subscribed is somebody who is not part of
      // whatever was agreed.
      if (!contact.phoneE164 || contact.status !== "subscribed") continue;
      if (contact.smsConsent) continue;
      contact.smsConsent = true;
      contact.smsConsentSource = source;
    }
  }
  const counts: Record<ContactStatus, number> = {
    subscribed: 0,
    unsubscribed: 0,
    cleaned: 0,
    never: 0,
  };
  const tagCounts = new Map<string, number>();

  for (const contact of contacts) {
    counts[contact.status]++;
    for (const tag of contact.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }

  const mailableContacts = contacts.filter((c) => c.status === "subscribed");
  const noOptinRecord = mailableContacts.filter((c) => !c.optinRecorded).length;

  if (noOptinRecord > 0) {
    warnings.push(
      `${noOptinRecord} of the ${mailableContacts.length} mailable contacts have no record of opting in: they were bulk uploaded into Mailchimp rather than signing up. They are tagged "No opt-in record" so you can leave them out of a send.`,
    );
  }
  if (duplicates.size > 0) {
    warnings.push(
      `${duplicates.size} addresses appeared in more than one export. The most restrictive status was kept for each.`,
    );
  }

  return {
    contacts,
    files: summaries,
    counts,
    duplicates: [...duplicates],
    tags: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
    mailable: mailableContacts.length,
    withPhone: contacts.filter((c) => c.phoneE164).length,
    smsConsenting: contacts.filter((c) => c.smsConsent).length,
    noOptinRecord,
    warnings,
  };
}

/** Lower is more restrictive, and more restrictive always wins. */
const STATUS_RANK: Record<ContactStatus, number> = {
  cleaned: 0,
  unsubscribed: 1,
  never: 2,
  subscribed: 3,
};

function mergeContacts(a: PlannedContact, b: PlannedContact): PlannedContact {
  const keep = STATUS_RANK[a.status] <= STATUS_RANK[b.status] ? a : b;
  const other = keep === a ? b : a;

  return {
    ...keep,
    // Everything else takes whichever record actually has something.
    firstName: keep.firstName ?? other.firstName,
    lastName: keep.lastName ?? other.lastName,
    phone: keep.phone ?? other.phone,
    phoneE164: keep.phoneE164 ?? other.phoneE164,
    squareCustomerId: keep.squareCustomerId ?? other.squareCustomerId,
    createdAt: keep.createdAt ?? other.createdAt,
    tags: [...new Set([...keep.tags, ...other.tags])],
    optinRecorded: keep.optinRecorded || other.optinRecorded,
    smsConsent: keep.smsConsent || other.smsConsent,
    smsConsentSource: keep.smsConsentSource ?? other.smsConsentSource,
    note: keep.note ?? other.note ?? "Appeared in more than one export",
  };
}

/** The tag put on anyone mailable with no opt-in record of their own. */
export const NO_OPTIN_TAG = "No opt-in record";

/** Tags as they will be stored, including the ones we add ourselves. */
export function finalTags(contact: PlannedContact): string[] {
  const tags = [...contact.tags];
  if (contact.status === "subscribed" && !contact.optinRecorded && !tags.includes(NO_OPTIN_TAG)) {
    tags.push(NO_OPTIN_TAG);
  }
  return tags;
}
