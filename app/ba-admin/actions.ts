"use server";

import { revalidatePath } from "next/cache";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import {
  getBaAdminData,
  recordPayRun,
  recordPayout,
  type BaAdminData,
  type PayRunResult,
} from "@/lib/baAdmin";
import {
  applyCommissionBackfill,
  previewCommissionBackfill,
  type BackfillReport,
} from "@/lib/commissionBackfill";

/**
 * Every action here can see, and settle, every ambassador's money. The
 * permission is re-checked on the server each time rather than trusted
 * from a client that could simply call the action — a hidden tab is not
 * a closed door.
 *
 * Returns the acting account's code so a payout has an author.
 */
async function requireBaAdmin(): Promise<string | null> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return null;
  const account = await getByCode(code).catch(() => null);
  if (!account) return null;
  if (!account.isSuperAdmin && !account.permissions.baAdmin) return null;
  return account.code;
}

/**
 * Rewriting every historical commission figure at once is a bigger thing
 * than settling one month, so it takes the stricter gate — previewing it
 * is open to anyone who can already see the numbers.
 */
async function requireSuperAdmin(): Promise<string | null> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return null;
  const account = await getByCode(code).catch(() => null);
  return account?.isSuperAdmin ? account.code : null;
}

export async function loadBaAdminAction(period?: string): Promise<BaAdminData | null> {
  if (!(await requireBaAdmin())) return null;
  return getBaAdminData(period);
}

export async function recordPayoutAction(input: {
  code: string;
  period: string;
  amountCents: number;
  method: string;
  reference?: string;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const author = await requireBaAdmin();
  if (!author) return { ok: false, error: "You don't have access to record payouts." };

  const result = await recordPayout({ ...input, paidBy: author });
  if (result.ok) revalidatePath("/portal/ba-admin");
  return result;
}

export async function recordPayRunAction(period: string): Promise<PayRunResult> {
  const author = await requireBaAdmin();
  if (!author) {
    return { ok: false, recorded: 0, totalCents: 0, skipped: [], error: "You don't have access." };
  }

  const result = await recordPayRun(period, author);
  if (result.ok && result.recorded > 0) revalidatePath("/portal/ba-admin");
  return result;
}

export async function previewCommissionBackfillAction(): Promise<BackfillReport | null> {
  if (!(await requireBaAdmin())) return null;
  return previewCommissionBackfill();
}

export async function applyCommissionBackfillAction(): Promise<BackfillReport | null> {
  if (!(await requireSuperAdmin())) return null;
  const report = await applyCommissionBackfill();
  if (report.ok) revalidatePath("/portal/ba-admin");
  return report;
}
