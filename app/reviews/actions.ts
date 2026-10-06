"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";
import { moderateReview, replyToReview, submitReview, type SubmitResult } from "@/lib/reviews";
import { reviewerForToken } from "@/lib/reviewRequests";

/**
 * The public one: anyone who bought something can say what they think,
 * and plenty of people who review a thing never made an account.
 *
 * It takes a review; it never publishes one. Approval is a separate act
 * by a person, in the portal.
 */
export async function submitReviewAction(input: {
  productId: string;
  productSlug?: string | null;
  productName: string;
  variationIds?: string[];
  rating: number;
  title?: string;
  body: string;
  authorName: string;
  authorEmail: string;
  /**
   * From the link in the review request email. It IS the proof of
   * purchase: it was issued to one order and only sent to the address on
   * it, so a review arriving with one needs no Square lookup and the
   * email on the form is ignored in favour of the one it was issued to.
   */
  reviewToken?: string;
  /**
   * Hidden field no person ever sees. A bot that fills in every input
   * fills this one too, and gets told the same cheerful thing as
   * everyone else so it has nothing to learn from and retune against.
   */
  website?: string;
}): Promise<SubmitResult> {
  if (input.website) return { ok: true, verifiedPurchase: false };

  // Signed in, if they happen to be. Never required: making people make
  // an account to review something is how you end up with no reviews.
  const accountCode = await getSessionAmbassadorCode().catch(() => null);

  // Vercel puts the real client address first in x-forwarded-for. Only
  // ever hashed, inside submitReview.
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    null;

  // Checked before anything else is trusted. A bad token is simply not a
  // verified review rather than a rejected one: somebody who mistyped a
  // link should still be able to say what they think.
  const verified = input.reviewToken ? await reviewerForToken(input.reviewToken) : null;

  return submitReview({
    ...input,
    // The address the request went to, not whatever is in the form.
    authorEmail: verified?.email ?? input.authorEmail,
    authorName: input.authorName || verified?.name || "",
    verifiedByToken: Boolean(verified),
    accountCode,
    ip,
  }).catch((err) => {
    console.error("Review submission failed:", err);
    return { ok: false as const, error: "Couldn't save that right now. Please try again later." };
  });
}

/**
 * Re-checked on the server every time rather than trusted from the page
 * that rendered the buttons: an action is a URL, and whoever can call it
 * decides what appears under a product and what Google reads.
 */
async function requireReviewAdmin() {
  const code = await getSessionAmbassadorCode();
  if (!code) redirect("/login");

  const account = await getByCode(code);
  if (!account || !(account.isSuperAdmin || account.permissions.reviews)) {
    redirect("/portal");
  }

  return account;
}

/**
 * Publishing changes a static page, so the product page is rebuilt now
 * rather than within the minute its revalidate window allows. Approving
 * a review and then not seeing it is indistinguishable from the button
 * not working.
 */
function refreshProduct(productSlug: string | null) {
  if (productSlug) revalidatePath(`/shop/${productSlug}`);
}

export async function moderateReviewAction(formData: FormData) {
  const account = await requireReviewAdmin();

  const id = String(formData.get("id") || "").trim();
  const decision = String(formData.get("decision") || "").trim();

  if (id && (decision === "approved" || decision === "rejected")) {
    const { productSlug } = await moderateReview(id, decision, account.code);
    refreshProduct(productSlug);
  }

  redirect("/portal/reviews");
}

export async function replyToReviewAction(formData: FormData) {
  await requireReviewAdmin();

  const id = String(formData.get("id") || "").trim();
  const body = String(formData.get("reply") || "");

  if (id) {
    const { productSlug } = await replyToReview(id, body);
    refreshProduct(productSlug);
  }

  redirect("/portal/reviews");
}
