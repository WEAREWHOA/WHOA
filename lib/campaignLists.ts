import { Resend } from "resend";

import { getSupabase } from "./supabase";
import { normalizeEmail } from "./newsletter";

/**
 * The three recurring emails, and who is on each.
 *
 * One list used by the preference checkboxes in the portal, by the
 * unsubscribe footer, and by whatever picks recipients for a send. The
 * ids ARE the column names, so adding a fourth email is this list plus a
 * column, not a rename hunt through three files.
 */
export const CAMPAIGN_LISTS = [
  {
    id: "sub_events_weekly",
    name: "Weekly Upcoming Events",
    cadence: "Weekly",
    blurb: "What is on this week: pop-ups, WHOADEGA nights, SH!FT and everything else.",
  },
  {
    id: "sub_drops_monthly",
    name: "Monthly Collection Drops",
    cadence: "Monthly",
    blurb: "The new one-of-one pieces the moment they land, before they are gone.",
  },
  {
    id: "sub_newsletter_monthly",
    name: "Monthly WHOA Newsletter",
    cadence: "Monthly",
    blurb: "The longer read: artists, the shop, where we have been and what is next.",
  },
] as const;

export type CampaignListId = (typeof CAMPAIGN_LISTS)[number]["id"];

export const CAMPAIGN_LIST_IDS = CAMPAIGN_LISTS.map((l) => l.id) as readonly CampaignListId[];

export function isCampaignListId(value: string): value is CampaignListId {
  return (CAMPAIGN_LIST_IDS as readonly string[]).includes(value);
}

export type CampaignPreferences = Record<CampaignListId, boolean>;

/** What somebody gets when we have never heard from them: all three. */
export function defaultPreferences(): CampaignPreferences {
  return {
    sub_events_weekly: true,
    sub_drops_monthly: true,
    sub_newsletter_monthly: true,
  };
}

export interface SubscriberPreferences extends CampaignPreferences {
  /** False when this address is not on the list at all. */
  onList: boolean;
  /** subscribed | unsubscribed | cleaned | never. */
  status: string;
  /** True only where they chose these themselves. */
  chosen: boolean;
}

/**
 * Somebody's three switches.
 *
 * Returns the defaults with `onList: false` rather than null for an
 * address we do not hold, so the settings page can render the same three
 * checkboxes either way and the act of saving is what puts them on the
 * list. A form that renders differently depending on whether we happen
 * to have a row is a form nobody can reason about.
 */
export async function getPreferences(email: string): Promise<SubscriberPreferences> {
  const address = normalizeEmail(email);
  const fallback: SubscriberPreferences = {
    ...defaultPreferences(),
    onList: false,
    status: "never",
    chosen: false,
  };
  if (!address) return fallback;

  const { data, error } = await getSupabase()
    .from("newsletter_subscribers")
    .select("status, prefs_updated_at, sub_events_weekly, sub_drops_monthly, sub_newsletter_monthly")
    .eq("email", address)
    .maybeSingle();

  if (error) {
    // 0045 not run yet, or the row is unreadable. Defaults rather than a
    // thrown settings page: not knowing a preference is not a reason to
    // refuse somebody their account settings.
    console.error(`Couldn't read campaign preferences for ${address}:`, error.message);
    return fallback;
  }
  if (!data) return fallback;

  const row = data as Record<string, unknown>;
  return {
    onList: true,
    status: typeof row.status === "string" ? row.status : "subscribed",
    chosen: Boolean(row.prefs_updated_at),
    // `?? true` so a row written before 0045 reads as on everything,
    // which is what it was.
    sub_events_weekly: (row.sub_events_weekly as boolean | null) ?? true,
    sub_drops_monthly: (row.sub_drops_monthly as boolean | null) ?? true,
    sub_newsletter_monthly: (row.sub_newsletter_monthly as boolean | null) ?? true,
  };
}

export interface SavePreferencesResult {
  ok: boolean;
  error?: string;
}

/**
 * Write the three switches.
 *
 * Unticking all three is a real unsubscribe, not three falses sitting on
 * a subscribed row: somebody who has said no to everything has said no,
 * and leaving them "subscribed" would have them counted as mailable
 * forever. Ticking any of them back on undoes that, which is the one
 * place a form may set `subscribed`, because this one IS the person.
 *
 * `cleaned` is never touched. A hard bounce or a spam complaint is the
 * mailbox and the provider talking, and no checkbox overrides it.
 */
export async function savePreferences(input: {
  email: string;
  name?: string | null;
  accountCode?: string | null;
  preferences: CampaignPreferences;
}): Promise<SavePreferencesResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "No email address on this account." };

  const current = await getPreferences(email);
  if (current.status === "cleaned") {
    // Silent on purpose: the person did not do anything wrong, and
    // "your address bounced" belongs in a conversation with staff, not
    // in a settings toast.
    console.error(`Refused to change preferences for ${email}: locally marked cleaned.`);
    return { ok: true };
  }

  const wantsSomething = CAMPAIGN_LIST_IDS.some((id) => input.preferences[id]);
  const [firstName, ...restOfName] = (input.name ?? "").trim().split(/\s+/);

  const row: Record<string, unknown> = {
    email,
    ...input.preferences,
    status: wantsSomething ? "subscribed" : "unsubscribed",
    prefs_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!wantsSomething) row.unsub_reason = "Turned off every list in their account settings";
  if (!current.onList) {
    // First time we have seen this address: it is a real opt-in, made by
    // the account holder about their own address.
    row.source = "portal";
    row.optin_recorded = true;
    row.first_name = firstName || null;
    row.last_name = restOfName.join(" ") || null;
    row.account_code = input.accountCode ?? null;
  }

  const { error } = await getSupabase()
    .from("newsletter_subscribers")
    .upsert(row, { onConflict: "email" });

  // Mirrored to Resend after our own write, so a Resend outage cannot
  // lose somebody's choice: the row is the record, and the topics are
  // the enforcement. Not awaited, for the reason in the function's own
  // comment, and logged loudly because the window where the two disagree
  // is the window where somebody gets an email they asked not to.
  if (!error) {
    void syncPreferencesToResend(email, input.preferences).catch((err) =>
      console.error(`Saved preferences for ${email} but Resend did not take them:`, err),
    );
  }

  if (error) {
    console.error(`Couldn't save campaign preferences for ${email}:`, error.message);
    return {
      ok: false,
      error: /column .* does not exist/i.test(error.message)
        ? "Email preferences aren't set up yet. Run migration 0045."
        : "Couldn't save that right now. Please try again.",
    };
  }
  return { ok: true };
}

/**
 * Everybody who should receive one send.
 *
 * Mailable AND on this list, in that order, because the per-list flag
 * only ever narrows. Anyone unsubscribed or cleaned is excluded by the
 * status check whatever their flags say.
 */
export async function recipientsForList(list: CampaignListId): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("newsletter_subscribers")
    .select("email")
    .eq("status", "subscribed")
    .eq(list, true);

  if (error) {
    throw new Error(`Couldn't read the ${list} list: ${error.message}`);
  }
  return (data ?? []).map((row) => (row as { email: string }).email);
}

/* ------------------------------------------------------------------ */
/* Resend topics                                                       */
/* ------------------------------------------------------------------ */

/**
 * Our three switches, mirrored into Resend as topics.
 *
 * This is the part that makes a preference mean something. Our database
 * is where somebody sets it, but it is Resend that actually sends, and a
 * broadcast goes to a segment without consulting us. A preference we
 * store and never tell Resend about is a checkbox that does nothing,
 * which is worse than not offering one.
 *
 * Resend has topics for exactly this: a contact is opted in or out per
 * topic, a broadcast names a topicId, and Resend excludes the opted-out
 * itself. That also makes the unsubscribe link in each send a per-topic
 * unsubscribe rather than a total one, which is the same improvement
 * seen from the reader's end.
 *
 * Topics are found by name and created when missing, rather than kept in
 * three environment variables. An id in an env var is one redeploy away
 * from pointing at nothing, and the failure is silent: the send goes to
 * everybody.
 */
function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Missing Resend env var: RESEND_API_KEY is required.");
  return new Resend(key);
}

/** Resolved once per process. A topic id does not change under us. */
let topicIdCache: Map<CampaignListId, string> | null = null;

export async function getTopicIds(): Promise<Map<CampaignListId, string>> {
  if (topicIdCache) return topicIdCache;

  const resend = getResend();
  const existing = await resend.topics.list();
  if (existing.error) throw new Error(`Couldn't read Resend topics: ${existing.error.message}`);

  const byName = new Map<string, string>();
  for (const topic of existing.data?.data ?? []) {
    byName.set(topic.name.trim().toLowerCase(), topic.id);
  }

  const resolved = new Map<CampaignListId, string>();
  for (const list of CAMPAIGN_LISTS) {
    const found = byName.get(list.name.toLowerCase());
    if (found) {
      resolved.set(list.id, found);
      continue;
    }
    const created = await resend.topics.create({
      name: list.name,
      description: list.blurb,
      // Everybody already on the list opted into "the newsletter" when it
      // was all three of these, so the same reasoning as the column
      // defaults applies here: opting them out by default would empty
      // the lists on the day this starts being used.
      defaultSubscription: "opt_in",
    });
    if (created.error || !created.data?.id) {
      throw new Error(`Couldn't create the Resend topic "${list.name}": ${created.error?.message}`);
    }
    resolved.set(list.id, created.data.id);
  }

  topicIdCache = resolved;
  return resolved;
}

/**
 * Push one person's three switches to Resend.
 *
 * Best-effort and never awaited by the settings page: a preference saved
 * in our database and not yet mirrored is a short inconsistency, while a
 * settings page that fails because Resend is slow is a broken page. The
 * error is logged loudly because the window where the two disagree is
 * the window where somebody gets an email they asked not to.
 */
export async function syncPreferencesToResend(
  email: string,
  preferences: CampaignPreferences,
): Promise<void> {
  const address = normalizeEmail(email);
  if (!address) return;

  const ids = await getTopicIds();
  const topics = CAMPAIGN_LIST_IDS.filter((id) => ids.has(id)).map((id) => ({
    id: ids.get(id) as string,
    subscription: (preferences[id] ? "opt_in" : "opt_out") as "opt_in" | "opt_out",
  }));
  if (topics.length === 0) return;

  const result = await getResend().contacts.topics.update({ email: address, topics });
  if (result.error) {
    throw new Error(`Resend refused the topic update for ${address}: ${result.error.message}`);
  }
}
