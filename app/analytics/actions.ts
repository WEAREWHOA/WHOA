"use server";

import { getByCode } from "@/lib/store";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getAnalytics, type AnalyticsSnapshot } from "@/lib/kpiReport";
import { getJourneyMap, type JourneyMap } from "@/lib/journeys";
import {
  findAccounts,
  getCustomerJourney,
  type AccountMatch,
  type JourneySummary,
} from "@/lib/customerJourney";

const ALLOWED_PERIODS = [7, 30, 90] as const;

/**
 * Reloads the snapshot for a different period.
 *
 * The permission is re-checked here rather than trusted from the client:
 * this returns revenue, payouts and traffic for the whole business, and
 * the tab being hidden is not the same thing as the action being shut.
 */
export interface AnalyticsPayload {
  snapshot: AnalyticsSnapshot;
  journey: JourneyMap;
}

export async function loadAnalyticsAction(days: number): Promise<AnalyticsPayload | null> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return null;

  const account = await getByCode(code).catch(() => null);
  if (!account) return null;
  if (!account.isSuperAdmin && !account.permissions.analytics) return null;

  const period = (ALLOWED_PERIODS as readonly number[]).includes(days) ? days : 30;
  const [snapshot, journey] = await Promise.all([getAnalytics(period), getJourneyMap(period)]);
  return { snapshot, journey };
}

/**
 * Account lookup for the journey panel.
 *
 * Guarded exactly like the snapshot above: this returns one named
 * person's history, so the permission is re-checked on the server rather
 * than trusted from a client that could simply call the action.
 */
async function requireAnalytics(): Promise<boolean> {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return false;
  const account = await getByCode(code).catch(() => null);
  if (!account) return false;
  return account.isSuperAdmin || account.permissions.analytics;
}

export async function findAccountsAction(query: string): Promise<AccountMatch[]> {
  if (!(await requireAnalytics())) return [];
  const clean = query.trim().slice(0, 120);
  if (clean.length < 2) return [];
  return findAccounts(clean);
}

export async function getJourneyAction(code: string): Promise<JourneySummary | null> {
  if (!(await requireAnalytics())) return null;
  return getCustomerJourney(code.slice(0, 40));
}
