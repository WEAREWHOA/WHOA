// Static site URL with no next/headers dependency, unlike lib/site.ts's
// getSiteOrigin() — safe to import from a module that might end up in a
// client bundle (e.g. lib/approvalTokens.ts, reached from
// lib/customDesign.ts's client-side canvas code via lib/email.ts). The
// real production domain isn't known to this codebase yet — set
// NEXT_PUBLIC_SITE_URL in the deployment environment once it is.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
