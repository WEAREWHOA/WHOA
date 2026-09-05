import { createHash } from "crypto";

// Lazily read so a missing var only breaks a request that actually tries to
// subscribe someone, not the build — same pattern as lib/email.ts's
// getResend() and lib/square.ts's getSquare().
function getMailchimpConfig(): { apiKey: string; audienceId: string; dataCenter: string } {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("Missing Mailchimp env vars: MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID are required.");
  }
  // A Mailchimp API key is always "<key>-<datacenter>", e.g. "abc123-us21" —
  // the datacenter is what the API host is scoped to, not a separate setting.
  const dataCenter = apiKey.split("-").pop();
  if (!dataCenter) {
    throw new Error("Malformed MAILCHIMP_API_KEY — expected a '-<datacenter>' suffix, e.g. 'us21'.");
  }
  return { apiKey, audienceId, dataCenter };
}

function subscriberHash(email: string): string {
  return createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

export interface NewsletterSignupInput {
  email: string;
  firstName?: string;
  lastName?: string;
  // E.164-ish or however the user typed it — Mailchimp's PHONE merge field
  // is free text, not a validated phone type.
  phone?: string;
  tags: string[];
}

function buildMergeFields(input: NewsletterSignupInput): Record<string, string> {
  const fields: Record<string, string> = {};
  if (input.firstName) fields.FNAME = input.firstName;
  if (input.lastName) fields.LNAME = input.lastName;
  if (input.phone) fields.PHONE = input.phone;
  return fields;
}

// Subscribes an email (with optional name/phone merge fields) to the
// configured audience, tagged with `tags`. Public-facing (the /events
// newsletter signup), so this fails soft — returns an error string rather
// than throwing — same posture as lib/contact.ts's submitContactMessage.
//
// PHONE is not a default Mailchimp merge field — the audience needs a
// "Phone Number" merge field with tag PHONE (Audience > Settings > Audience
// fields) or Mailchimp will silently drop that value.
export async function subscribeToNewsletter(input: NewsletterSignupInput): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, audienceId, dataCenter } = getMailchimpConfig();
  const auth = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
  const membersUrl = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${audienceId}/members`;
  const mergeFields = buildMergeFields(input);

  const createResponse = await fetch(membersUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      email_address: input.email,
      status: "subscribed",
      tags: input.tags,
      merge_fields: mergeFields,
    }),
  });
  if (createResponse.ok) return { ok: true };

  const body: { title?: string; detail?: string } | null = await createResponse.json().catch(() => null);

  // Already on the list — update their name/phone and apply the tag
  // without touching their existing subscription status (never force a
  // resubscribe on someone who opted out, even via this "already exists"
  // path — PATCH here carries no `status` field at all).
  if (createResponse.status === 400 && body?.title === "Member Exists") {
    const hash = subscriberHash(input.email);

    if (Object.keys(mergeFields).length > 0) {
      await fetch(`${membersUrl}/${hash}`, {
        method: "PATCH",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ merge_fields: mergeFields }),
      }).catch(() => undefined);
    }

    const tagResponse = await fetch(`${membersUrl}/${hash}/tags`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: input.tags.map((name) => ({ name, status: "active" })) }),
    });
    if (tagResponse.ok) return { ok: true };
    const tagBody: { detail?: string } | null = await tagResponse.json().catch(() => null);
    return { ok: false, error: tagBody?.detail ?? "Couldn't update your subscription. Please try again." };
  }

  return { ok: false, error: body?.detail ?? "Couldn't sign you up. Please try again." };
}
