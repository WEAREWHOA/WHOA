import { Resend } from "resend";
import { getAudience, type AudienceContact } from "./audience";

/**
 * Sending to a tag, which Resend has no way to do on its own.
 *
 * A broadcast goes to a segment and nothing else: there is no tag
 * filter on it. Meanwhile every contact here already carries tags --
 * Ambassadors, Ticket Buyers, "Event: Pangaea Pop-Up" and the rest --
 * and the audience view has been counting them for a while with no way
 * to mail any of them. The two halves never met.
 *
 * This builds the bridge the obvious way round: a Resend segment whose
 * members are whoever carries one tag. Once it exists it is an ordinary
 * segment, so it turns up in the campaign screen's own Send to list and
 * needs no special case anywhere in the sending path.
 *
 * The name carries a prefix so a segment made this way can be told from
 * one somebody built in Resend by hand, which is what stops a sync
 * quietly rewriting a segment that was never ours.
 */

export const TAG_SEGMENT_PREFIX = "Tag: ";

/** Resend caps segment names; so does this, on the same boundary the
 *  per-event tag already uses. */
export function tagSegmentName(tag: string): string {
  return `${TAG_SEGMENT_PREFIX}${tag.trim()}`.slice(0, 100);
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  return new Resend(key);
}

/** Which tags already have a segment, as tag -> segment id. */
export async function listTagSegments(): Promise<Map<string, string>> {
  const result = await getResend().segments.list();
  if (result.error) throw new Error(result.error.message);

  const byTag = new Map<string, string>();
  for (const segment of result.data?.data ?? []) {
    if (!segment.name?.startsWith(TAG_SEGMENT_PREFIX)) continue;
    byTag.set(segment.name.slice(TAG_SEGMENT_PREFIX.length), segment.id);
  }
  return byTag;
}

export interface TagSyncResult {
  tag: string;
  segmentId: string;
  segmentName: string;
  /** Mailable contacts carrying the tag at the moment of the sync. */
  contacts: number;
  /** Null when the upload could not be started. */
  importId: string | null;
  /** False when the segment was already there and was topped up. */
  created: boolean;
}

/**
 * Put everyone carrying this tag into a segment of their own.
 *
 * Only contacts who can actually be mailed go in, which is the same
 * test the audience view counts by: subscribed here, and not
 * unsubscribed at Resend. Sending to a tag should mean sending to the
 * people on it, not to a number that includes addresses nobody is
 * allowed to write to.
 *
 * The upload is one bulk import rather than a call per contact. A tag
 * with two thousand people on it would otherwise be two thousand
 * requests, which is both slower than the rate limit allows and far
 * longer than a serverless request lives.
 *
 * The CSV carries no `unsubscribed` column on purpose. This is a sync
 * about membership and has no business deciding anybody's subscription
 * state; including the column would let a tag sync resurrect somebody
 * Resend has recorded as unsubscribed.
 *
 * An existing segment is reused rather than rebuilt, so its id stays
 * stable and a campaign already pointing at it keeps working. The cost
 * is that this adds and never removes: somebody who has since lost the
 * tag stays in the segment until it is deleted in Resend. Rebuilding
 * instead would have made every saved draft aimed at it point at an id
 * that no longer exists, which fails later and less visibly.
 */
export async function syncTagSegment(tag: string): Promise<TagSyncResult> {
  const wanted = tag.trim();
  if (!wanted) throw new Error("A tag is required.");

  const audience = await getAudience();
  if (audience.resendError) throw new Error(audience.resendError);

  const members = audience.contacts.filter(
    (contact: AudienceContact) =>
      contact.status === "subscribed" && !contact.unsubscribed && contact.tags.includes(wanted),
  );

  if (members.length === 0) {
    throw new Error(
      `Nobody on "${wanted}" can be mailed right now, so there is nothing to put in a segment.`,
    );
  }

  const resend = getResend();
  const name = tagSegmentName(wanted);

  const existing = (await listTagSegments()).get(wanted);
  let segmentId = existing;
  if (!segmentId) {
    const created = await resend.segments.create({ name });
    if (created.error) throw new Error(created.error.message);
    if (!created.data?.id) throw new Error("Resend didn't return a segment id.");
    segmentId = created.data.id;
  }

  const csv = [
    "email,first_name,last_name",
    ...members.map((contact) =>
      [cell(contact.email), cell(contact.firstName), cell(contact.lastName)].join(","),
    ),
  ].join("\n");

  const upload = await resend.contacts.imports.create({
    file: new Blob([csv], { type: "text/csv" }),
    columnMap: { email: "email", firstName: "first_name", lastName: "last_name" },
    // Everyone here is already a contact; this only adds the segment and
    // fills in a name where one was missing.
    onConflict: "upsert",
    segments: [{ id: segmentId }],
  });
  if (upload.error) throw new Error(upload.error.message);

  return {
    tag: wanted,
    segmentId,
    segmentName: name,
    contacts: members.length,
    importId: upload.data?.id ?? null,
    created: !existing,
  };
}

/** CSV escaping, matching buildResendCsv's rules. */
function cell(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
