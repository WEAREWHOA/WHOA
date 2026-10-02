"use server";

import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import {
  applyImportPlan,
  audienceCsv,
  getAudience,
  marketingFrom,
  type ApplyResult,
  type Audience,
} from "@/lib/audience";
import {
  cancelCampaign,
  createDraft,
  deleteCampaign,
  getCampaign,
  getCampaignStats,
  listCampaigns,
  listSegments,
  sendCampaign,
  sendTest,
  updateDraft,
  type Campaign,
  type CampaignStats,
} from "@/lib/campaigns";
import { planImport, type ImportFileInput, type ImportPlan } from "@/lib/mailchimpImport";

/**
 * Everything the EMAIL/TEXT tab does, behind one gate.
 *
 * Re-checked on the server for every call rather than trusted from the
 * page that drew the buttons. An action is a URL: whoever can call these
 * can read every contact's address and phone number, and send mail to
 * all of them in the company's name.
 */
async function requireEmailAdmin() {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return null;
  const account = await getByCode(code).catch(() => null);
  if (!account) return null;
  if (!(account.isSuperAdmin || account.permissions.newsletter)) return null;
  return account;
}

export async function loadAudienceAction(): Promise<Audience | null> {
  if (!(await requireEmailAdmin())) return null;
  return getAudience();
}

export async function exportAudienceAction(): Promise<string | null> {
  if (!(await requireEmailAdmin())) return null;
  const audience = await getAudience();
  return audienceCsv(audience.contacts);
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

/**
 * What the preview sends back.
 *
 * Counts and samples, not the two thousand contacts themselves. The
 * whole plan is several hundred kilobytes of other people's email
 * addresses, and it would be crossing the wire to a browser for no
 * reason: the apply step re-reads the same files on the server.
 */
export interface ImportPreview extends Omit<ImportPlan, "contacts" | "duplicates"> {
  totalContacts: number;
  duplicateCount: number;
  samples: {
    email: string;
    name: string;
    status: string;
    tags: string[];
    phone: string | null;
    note?: string;
  }[];
}

function toPreview(plan: ImportPlan): ImportPreview {
  return {
    files: plan.files,
    counts: plan.counts,
    tags: plan.tags,
    mailable: plan.mailable,
    withPhone: plan.withPhone,
    smsConsenting: plan.smsConsenting,
    noOptinRecord: plan.noOptinRecord,
    warnings: plan.warnings,
    totalContacts: plan.contacts.length,
    duplicateCount: plan.duplicates.length,
    samples: plan.contacts.slice(0, 8).map((c) => ({
      email: c.email,
      name: [c.firstName, c.lastName].filter(Boolean).join(" "),
      status: c.status,
      tags: c.tags,
      phone: c.phoneE164,
      note: c.note,
    })),
  };
}

export async function previewImportAction(
  files: ImportFileInput[],
): Promise<{ ok: true; preview: ImportPreview } | { ok: false; error: string }> {
  if (!(await requireEmailAdmin())) return { ok: false, error: "Not allowed." };
  try {
    return { ok: true, preview: toPreview(planImport(files)) };
  } catch (err) {
    console.error("Import preview failed:", err);
    return { ok: false, error: "Couldn't read those files. Are they the Mailchimp CSV exports?" };
  }
}

export async function applyImportAction(
  files: ImportFileInput[],
): Promise<ApplyResult | { ok: false; error: string; storedLocally: 0; sentToResend: 0; resendImportId: null; warnings: [] }> {
  if (!(await requireEmailAdmin())) {
    return { ok: false, error: "Not allowed.", storedLocally: 0, sentToResend: 0, resendImportId: null, warnings: [] };
  }
  try {
    // Re-planned here rather than trusting a plan sent from the browser.
    // The files are the input; a plan posted back could say anything.
    return await applyImportPlan(planImport(files));
  } catch (err) {
    console.error("Import failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "The import failed.",
      storedLocally: 0,
      sentToResend: 0,
      resendImportId: null,
      warnings: [],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

export interface CampaignsState {
  campaigns: Campaign[];
  segments: { id: string; name: string }[];
  from: string;
  error: string | null;
}

export async function loadCampaignsAction(): Promise<CampaignsState | null> {
  if (!(await requireEmailAdmin())) return null;
  try {
    const [campaigns, segments] = await Promise.all([listCampaigns(), listSegments()]);
    return { campaigns, segments, from: marketingFrom(), error: null };
  } catch (err) {
    console.error("Couldn't load campaigns:", err);
    return {
      campaigns: [],
      segments: [],
      from: marketingFrom(),
      error: err instanceof Error ? err.message : "Couldn't reach Resend.",
    };
  }
}

export async function loadCampaignAction(
  id: string,
): Promise<{ campaign: Campaign; stats: CampaignStats | null } | null> {
  if (!(await requireEmailAdmin())) return null;
  const campaign = await getCampaign(id);
  // Stats only exist once something has been sent, and asking for them
  // on a draft is a handful of pointless round trips.
  const stats =
    campaign.status === "sent"
      ? await getCampaignStats(id).catch((err) => {
          console.error("Couldn't load campaign stats:", err);
          return null;
        })
      : null;
  return { campaign, stats };
}

type Simple = { ok: boolean; error?: string; id?: string };

async function guarded(run: () => Promise<Simple>): Promise<Simple> {
  if (!(await requireEmailAdmin())) return { ok: false, error: "Not allowed." };
  try {
    return await run();
  } catch (err) {
    console.error("Campaign action failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "That didn't work." };
  }
}

export async function saveCampaignAction(input: {
  id?: string;
  name: string;
  subject: string;
  previewText?: string;
  replyTo?: string;
  html: string;
  text?: string;
  segmentId: string;
}): Promise<Simple> {
  return guarded(async () => {
    const payload = { ...input, from: marketingFrom() };
    if (input.id) {
      await updateDraft(input.id, payload);
      return { ok: true, id: input.id };
    }
    const id = await createDraft(payload);
    return { ok: true, id };
  });
}

export async function sendTestAction(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<Simple> {
  return guarded(async () => {
    await sendTest({ ...input, from: marketingFrom() });
    return { ok: true };
  });
}

export async function sendCampaignAction(id: string, scheduledAt?: string): Promise<Simple> {
  return guarded(async () => {
    await sendCampaign(id, scheduledAt || undefined);
    return { ok: true, id };
  });
}

export async function cancelCampaignAction(id: string): Promise<Simple> {
  return guarded(async () => {
    await cancelCampaign(id);
    return { ok: true, id };
  });
}

export async function deleteCampaignAction(id: string): Promise<Simple> {
  return guarded(async () => {
    await deleteCampaign(id);
    return { ok: true, id };
  });
}
