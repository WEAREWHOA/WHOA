"use server";

import { destroySession } from "@/lib/auth";
import { getAccountSummary, type AccountSummary } from "@/lib/accountAuth";

// Backs the inline "sign in / create an account with this email" bar shared
// by checkout and event RSVP/ticket forms.
export async function getAccountAction(): Promise<AccountSummary | null> {
  return getAccountSummary();
}

// Deliberately doesn't redirect (unlike lib/actions.ts's logoutAction) —
// called from checkout/event pages that must leave the buyer right where
// they were, cart/form state intact.
export async function accountSignOutAction(): Promise<void> {
  await destroySession();
}
