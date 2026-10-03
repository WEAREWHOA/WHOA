import { Resend } from "resend";

/**
 * Campaigns, which Resend calls broadcasts.
 *
 * Resend owns these entirely: the draft, the schedule, the send and
 * every open and click. Nothing is mirrored, because a second copy of a
 * send's results is a second copy that can be wrong.
 */

export type CampaignStatus = "draft" | "queued" | "sent";

export interface Campaign {
  id: string;
  name: string;
  subject: string | null;
  previewText: string | null;
  from: string | null;
  status: CampaignStatus;
  segmentId: string | null;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
  html: string | null;
  text: string | null;
}

export interface CampaignStat {
  /** "1,000+" when the count was capped rather than finished. */
  capped: boolean;
  count: number;
}

export interface CampaignStats {
  delivered: CampaignStat;
  opened: CampaignStat;
  clicked: CampaignStat;
  bounced: CampaignStat;
  unsubscribed: CampaignStat;
  complained: CampaignStat;
  links: { url: string; clicks: number; uniqueClicks: number }[];
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  return new Resend(key);
}

function toCampaign(b: {
  id: string;
  name?: string | null;
  subject?: string | null;
  preview_text?: string | null;
  from?: string | null;
  status: string;
  segment_id?: string | null;
  audience_id?: string | null;
  created_at: string;
  scheduled_at?: string | null;
  sent_at?: string | null;
  html?: string | null;
  text?: string | null;
}): Campaign {
  return {
    id: b.id,
    name: b.name || "Untitled",
    subject: b.subject ?? null,
    previewText: b.preview_text ?? null,
    from: b.from ?? null,
    status: (b.status as CampaignStatus) ?? "draft",
    segmentId: b.segment_id ?? b.audience_id ?? null,
    createdAt: b.created_at,
    scheduledAt: b.scheduled_at ?? null,
    sentAt: b.sent_at ?? null,
    html: b.html ?? null,
    text: b.text ?? null,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const result = await getResend().broadcasts.list({ limit: 100 });
  if (result.error) throw new Error(result.error.message);
  const rows = result.data?.data ?? [];
  return rows
    .map((b) => toCampaign(b as Parameters<typeof toCampaign>[0]))
    .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign> {
  const result = await getResend().broadcasts.get(id);
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("That campaign no longer exists.");
  return toCampaign(result.data);
}

/**
 * How many pages of recipients to read per event type before giving up
 * and saying "at least this many".
 *
 * Resend's recipients endpoint pages with a cursor and reports no total,
 * so an exact count of a big send means reading every page of every
 * event type. Five pages is a thousand recipients, which is enough to be
 * useful and few enough to return inside a request. Where it is not
 * enough the number is shown with a plus rather than quietly truncated.
 */
const MAX_STAT_PAGES = 5;
const STAT_PAGE_SIZE = 100;

type EventType = "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed" | "complained";

async function countRecipients(id: string, type: EventType): Promise<CampaignStat> {
  const resend = getResend();
  let count = 0;
  let after: string | undefined;

  for (let page = 0; page < MAX_STAT_PAGES; page++) {
    const result = await resend.broadcasts.recipients(id, {
      type,
      limit: STAT_PAGE_SIZE,
      ...(after ? { after } : {}),
    });
    if (result.error) throw new Error(result.error.message);

    const rows = result.data?.data ?? [];
    count += rows.length;
    if (!result.data?.has_more || rows.length === 0) return { count, capped: false };
    after = rows[rows.length - 1]?.id;
    if (!after) return { count, capped: false };
  }

  return { count, capped: true };
}

export async function getCampaignStats(id: string): Promise<CampaignStats> {
  const types: EventType[] = [
    "delivered", "opened", "clicked", "bounced", "unsubscribed", "complained",
  ];

  const [stats, linksResult] = await Promise.all([
    Promise.all(types.map((t) => countRecipients(id, t))),
    // Already aggregated by Resend, so this one is exact and cheap.
    getResend().broadcasts.clickedLinks(id, { limit: 100 }).catch(() => null),
  ]);

  const byType = Object.fromEntries(types.map((t, i) => [t, stats[i]])) as Record<EventType, CampaignStat>;

  return {
    ...byType,
    links: (linksResult?.data?.data ?? []).map((l) => ({
      url: l.url,
      clicks: l.clicks,
      uniqueClicks: l.unique_clicks,
    })),
  };
}

export interface ComposeInput {
  name: string;
  subject: string;
  previewText?: string;
  from: string;
  replyTo?: string;
  html: string;
  text?: string;
  segmentId: string;
}

/** Save a draft. Nothing is sent. */
export async function createDraft(input: ComposeInput): Promise<string> {
  const result = await getResend().broadcasts.create({
    name: input.name,
    subject: input.subject,
    previewText: input.previewText,
    from: input.from,
    replyTo: input.replyTo ? [input.replyTo] : undefined,
    html: input.html,
    text: input.text,
    segmentId: input.segmentId,
    send: false,
  });
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.id) throw new Error("Resend didn't return a campaign id.");
  return result.data.id;
}

export async function updateDraft(id: string, input: Partial<ComposeInput>): Promise<void> {
  const result = await getResend().broadcasts.update(id, {
    name: input.name,
    subject: input.subject,
    previewText: input.previewText,
    from: input.from,
    replyTo: input.replyTo ? [input.replyTo] : undefined,
    html: input.html,
    text: input.text,
    segmentId: input.segmentId,
  });
  if (result.error) throw new Error(result.error.message);
}

/**
 * Send, or schedule.
 *
 * scheduledAt is ISO 8601 or Resend's relative form ("in 2 days"). A
 * campaign with a schedule can still be cancelled; one sent now cannot,
 * which is why the tab asks twice.
 */
export async function sendCampaign(id: string, scheduledAt?: string): Promise<void> {
  const result = await getResend().broadcasts.send(id, scheduledAt ? { scheduledAt } : undefined);
  if (result.error) throw new Error(result.error.message);
}

export async function cancelCampaign(id: string): Promise<void> {
  const result = await getResend().broadcasts.cancel(id);
  if (result.error) throw new Error(result.error.message);
}

export async function deleteCampaign(id: string): Promise<void> {
  const result = await getResend().broadcasts.remove(id);
  if (result.error) throw new Error(result.error.message);
}

/**
 * A test send, to one address.
 *
 * A plain email rather than a broadcast: a broadcast goes to a segment,
 * and there is no segment containing only you. This is the same HTML
 * through the same sender, which is what a test is for.
 */
export async function sendTest(input: {
  to: string;
  subject: string;
  from: string;
  replyTo?: string;
  html: string;
  text?: string;
}): Promise<void> {
  const result = await getResend().emails.send({
    to: input.to,
    from: input.from,
    // The same reply-to as the real send, so the test shows what a
    // recipient hitting reply would actually get.
    replyTo: input.replyTo,
    subject: `[TEST] ${input.subject}`,
    html: input.html,
    text: input.text,
  });
  if (result.error) throw new Error(result.error.message);
}

/** The Resend segments a campaign can be aimed at. */
export async function listSegments(): Promise<{ id: string; name: string }[]> {
  const result = await getResend().segments.list();
  if (result.error) throw new Error(result.error.message);
  return (result.data?.data ?? []).map((s) => ({ id: s.id, name: s.name }));
}
