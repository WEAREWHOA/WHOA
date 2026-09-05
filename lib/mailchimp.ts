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

// Subscribes an email to the configured audience, tagged with `tags`.
// Public-facing (the /events newsletter signup), so this fails soft —
// returns an error string rather than throwing — same posture as
// lib/contact.ts's submitContactMessage.
export async function subscribeToNewsletter(email: string, tags: string[]): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, audienceId, dataCenter } = getMailchimpConfig();
  const auth = `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`;
  const membersUrl = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

  const createResponse = await fetch(membersUrl, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: email, status: "subscribed", tags }),
  });
  if (createResponse.ok) return { ok: true };

  const body: { title?: string; detail?: string } | null = await createResponse.json().catch(() => null);

  // Already on the list — apply the tag without touching their existing
  // subscription status (never force a resubscribe on someone who opted
  // out, even via this "already exists" path).
  if (createResponse.status === 400 && body?.title === "Member Exists") {
    const tagResponse = await fetch(`${membersUrl}/${subscriberHash(email)}/tags`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ tags: tags.map((name) => ({ name, status: "active" })) }),
    });
    if (tagResponse.ok) return { ok: true };
    const tagBody: { detail?: string } | null = await tagResponse.json().catch(() => null);
    return { ok: false, error: tagBody?.detail ?? "Couldn't update your subscription. Please try again." };
  }

  return { ok: false, error: body?.detail ?? "Couldn't sign you up. Please try again." };
}
