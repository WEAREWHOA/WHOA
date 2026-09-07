"use server";

import { redirect } from "next/navigation";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { reviewArtBatch, reviewArtProduct, reviewArtProductRequest } from "@/lib/artCollective";

// Shared guard for the ART ADMIN tab's own actions — Super Admin or the
// artAdmin permission, same check the tab's data fetch already requires.
async function requireArtAdmin() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account || !(account.isSuperAdmin || account.permissions.artAdmin)) {
    redirect(`/portal/${code}`);
  }

  return account;
}

export async function reviewArtProductAction(formData: FormData) {
  const account = await requireArtAdmin();

  const productId = String(formData.get("productId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  if (productId && (decision === "approved" || decision === "declined")) {
    await reviewArtProduct(productId, decision);
  }

  redirect(`/portal/${account.code}`);
}

export async function reviewArtBatchAction(formData: FormData) {
  const account = await requireArtAdmin();

  const batchId = String(formData.get("batchId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  if (batchId && (decision === "approved" || decision === "declined")) {
    await reviewArtBatch(batchId, decision);
  }

  redirect(`/portal/${account.code}`);
}

/**
 * Approves or declines an artist's request to change or pull an approved
 * product. Same guard as every other action here — this reaches Square, so
 * it can't be reachable by anyone who isn't staff.
 */
export async function reviewArtProductRequestAction(formData: FormData) {
  const account = await requireArtAdmin();

  const productId = String(formData.get("productId") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  if (productId && (decision === "approved" || decision === "declined")) {
    await reviewArtProductRequest(productId, decision);
  }

  redirect(`/portal/${account.code}?artRequestReviewed=1`);
}
