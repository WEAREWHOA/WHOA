import { SITE_URL } from "@/lib/siteUrl";

/**
 * The brand, as structured data.
 *
 * Rendered once in the root layout. Every product page's own markup
 * names WHOA as the brand and seller, and this is the record those point
 * at, which is what lets Google and the AI shopping surfaces treat the
 * catalogue as one merchant's rather than a pile of unrelated pages.
 *
 * Only claims the site makes elsewhere. A sameAs list of profiles we
 * don't control, or an address we don't publish, would be worse than
 * leaving them out.
 */
const organization = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "WHOA",
  alternateName: "WE ARE WHOA",
  url: SITE_URL,
  // Both on /about/history.
  foundingDate: "2015",
  founder: { "@type": "Person", name: "WASANI", url: `${SITE_URL}/music-collective/wasani` },
  description:
    "One-of-a-kind hand-bleached and hand-painted apparel from San Diego, California. Every piece is finished by hand, so no two are alike.",
  email: "info@wearewhoa.com",
  telephone: "+1-619-630-9551",
  areaServed: "Worldwide",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: "info@wearewhoa.com",
    telephone: "+1-619-630-9551",
    availableLanguage: "English",
  },
};

export const ORGANIZATION_JSON_LD = JSON.stringify(organization).replace(/</g, "\\u003c");
