import type { Metadata } from "next";
import SsbdExperience from "@/components/go/SsbdExperience";

/**
 * /go — the SSBD EXPERIENCE.
 *
 * A front door rather than a page: a portal opens, you travel through it,
 * and land in a village whose four huts are real parts of this site. It
 * runs without the site's own chrome (see components/SiteChrome.tsx) so
 * arriving feels like arriving somewhere, with its own way back out.
 */
export const metadata: Metadata = {
  title: "The SSBD Experience",
  description:
    "Step through the portal into the SSBD village — the WHOAdega bazaar, the arcade, the Creation Station and the WHOA Oasis.",
};

export default function GoPage() {
  return <SsbdExperience />;
}
