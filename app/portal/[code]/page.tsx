import { redirect } from "next/navigation";

/**
 * The old /portal/<CODE> dashboard.
 *
 * The code was redundant — it could only ever equal the session's own —
 * and it leaked into history, screenshots and the traffic table. Kept as
 * a redirect rather than deleted, because it is in people's bookmarks,
 * in old emails and in links already sent out.
 *
 * Bounced to /portal without checking the code: the layout resolves who
 * is signed in and shows them their own portal, which is the only thing
 * this route could ever have done anyway.
 */
export default async function LegacyPortalCodePage() {
  redirect("/portal");
}
