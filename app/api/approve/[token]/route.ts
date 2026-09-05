import { NextRequest, NextResponse } from "next/server";
import { consumeApprovalToken, getApprovalToken } from "@/lib/approvalTokens";
import { updatePermissions } from "@/lib/store";
import { reviewWorkSignup } from "@/lib/eventSales";
import { reviewArtProduct } from "@/lib/artCollective";

function htmlPage(title: string, message: string): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { background:#0a0806; color:#f7f0e6; font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; text-align:center; }
  div { max-width:420px; }
  h1 { font-size:22px; margin:0 0 8px; }
  p { color:#b8ada0; font-size:14px; line-height:1.5; margin:0; }
</style>
</head>
<body><div><h1>${title}</h1><p>${message}</p></div></body>
</html>`;
}

function respond(title: string, message: string, status = 200): NextResponse {
  return new NextResponse(htmlPage(title, message), { status, headers: { "Content-Type": "text/html" } });
}

// One-click Approve/Decline links from staff notification emails (see
// lib/email.ts's buildApprovalActions) land here. No login required by
// design — the unguessable token in the URL is the credential, same
// posture as a password-reset link. See migration
// 0018_approval_tokens.sql for the token lifecycle (single-use, 30-day
// expiry).
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const decisionParam = request.nextUrl.searchParams.get("decision");
  const decision = decisionParam === "approve" ? "approved" : decisionParam === "decline" ? "declined" : null;

  if (!decision) {
    return respond("Invalid link", "This approval link is missing a decision.", 400);
  }

  let record;
  try {
    record = await getApprovalToken(token);
  } catch (err) {
    console.error("Approval token lookup failed:", err);
    return respond("Something went wrong", "Couldn't look up this link — please use the portal instead.", 500);
  }

  if (!record) {
    return respond("Link not found", "This approval link doesn't exist — it may have been mistyped.", 404);
  }
  if (record.usedAt) {
    return respond("Already handled", `This request was already ${record.decision} — no action taken.`);
  }
  if (new Date(record.expiresAt) < new Date()) {
    return respond("Link expired", "This approval link has expired — handle it from the portal instead.", 410);
  }

  let message: string;
  try {
    switch (record.kind) {
      case "ambassador_application":
        // Ambassador access is granted instantly at signup — Approve is
        // just an acknowledgment; Decline revokes it.
        if (decision === "declined" && record.subjectCode) {
          await updatePermissions(record.subjectCode, { permissions: { ambassador: false } });
          message = "Ambassador access revoked.";
        } else {
          message = "Acknowledged — no change needed, they already have ambassador access.";
        }
        break;

      case "event_sales_application":
        if (record.subjectCode) {
          await updatePermissions(record.subjectCode, { permissions: { eventSales: decision === "approved" } });
        }
        message = decision === "approved" ? "Event Sales access granted." : "Application declined.";
        break;

      case "music_application":
        if (record.subjectCode) {
          await updatePermissions(record.subjectCode, { permissions: { music: decision === "approved" } });
        }
        message = decision === "approved" ? "Music Collective access granted." : "Application declined.";
        break;

      case "art_application":
        if (record.subjectCode) {
          await updatePermissions(record.subjectCode, { permissions: { art: decision === "approved" } });
        }
        message = decision === "approved" ? "Art Collective access granted." : "Application declined.";
        break;

      case "event_sales_signup":
        if (record.subjectId) await reviewWorkSignup(record.subjectId, decision);
        message = decision === "approved" ? "Added to their schedule." : "Signup declined.";
        break;

      case "art_product":
        if (record.subjectId) await reviewArtProduct(record.subjectId, decision);
        message = decision === "approved" ? "Product approved — it's live in the shop." : "Product declined.";
        break;

      default:
        message = "Nothing to do.";
    }

    await consumeApprovalToken(token, decision);
  } catch (err) {
    console.error("Approval action failed:", err);
    return respond("Something went wrong", "The action couldn't be completed — please use the portal instead.", 500);
  }

  return respond(decision === "approved" ? "Approved" : "Declined", message);
}
