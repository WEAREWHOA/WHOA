"use server";

import { getByCode } from "@/lib/store";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getAnalytics, type AnalyticsSnapshot } from "@/lib/kpiReport";
import { getJourneyMap, type JourneyMap } from "@/lib/journeys";

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
