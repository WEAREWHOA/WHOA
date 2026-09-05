"use server";

import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { reviewWorkSignup } from "@/lib/eventSales";

// Shared guard for the EVENTS ADMIN tab's own actions — Super Admin or the
// eventsAdmin permission, same check the tab's data fetch already requires.
async function requireEventsAdmin() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account || !(account.isSuperAdmin || account.permissions.eventsAdmin)) {
    redirect(`/portal/${code}`);
  }

  return account;
}

export async function reviewWorkSignupAction(formData: FormData) {
  const account = await requireEventsAdmin();

  const signupId = String(formData.get("signupId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  if (signupId && (decision === "approved" || decision === "declined")) {
    await reviewWorkSignup(signupId, decision);
  }

  redirect(`/portal/${account.code}`);
}
