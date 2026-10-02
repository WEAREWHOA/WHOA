import EmailTextTab from "@/components/dashboard/email/EmailTextTab";
import { getAudience } from "@/lib/audience";
import { requirePortalTab } from "@/lib/portalAccess";

/**
 * Every contact's email address and phone number is on this page, so the
 * audience is fetched behind the gate rather than loaded and then
 * hidden, which would still ship the whole list in the page payload.
 */
export default async function PortalEmailPage() {
  await requirePortalTab("newsletter");
  const audience = await getAudience();
  return <EmailTextTab initial={audience} />;
}
