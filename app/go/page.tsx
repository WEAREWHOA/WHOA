import type { Metadata } from "next";
import GoGate from "@/components/go/GoGate";
import SsbdExperience from "@/components/go/SsbdExperience";
import { getSessionAmbassadorCode } from "@/lib/auth";
import { getByCode } from "@/lib/store";

/**
 * /go — the SSBD EXPERIENCE.
 *
 * An account is the key: anyone without a session gets the door, and the
 * four elements are only on the other side of it. The check is here on the
 * server rather than in the browser, so the experience can't be reached by
 * flipping a flag in devtools.
 *
 * Runs without the site's own chrome (see components/SiteChrome.tsx), with
 * its own way back out.
 */
export const metadata: Metadata = {
  title: "The SSBD Experience",
  description: "Step through the portal and pick your element — fire, air, earth or water.",
};

export default async function GoPage() {
  const code = await getSessionAmbassadorCode().catch(() => null);
  if (!code) return <GoGate />;

  // Only for the greeting — a lookup failure shouldn't hold the door shut
  // on someone who is plainly signed in.
  const account = await getByCode(code).catch(() => undefined);
  return <SsbdExperience name={account?.name?.split(" ")[0]} />;
}
