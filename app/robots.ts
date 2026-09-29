import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/pos",
        "/pos/",
        "/event-sales/ssbd-2026",
        "/event-sales/ssbd-2026/",
        // Crew-only, same as the event page above it. It redirects anyone
        // without the permission, so a crawler gets nothing useful — but
        // it was the one staff page not named here.
        "/event-sales/welcome-guide",
        "/super-admin",
        "/super-admin/",
        "/portal",
        "/portal/",
        "/login",
        "/admin",
        "/admin/",
        "/checkout",
        "/cart",
        "/order-confirmed",
        "/api/",
        "/r/",
        "/games/hunt/print",
        "/checkin/",
      ],
    },
    // Both are listed so a crawler that only reads robots.txt still
    // finds the catalogue: the sitemap for the pages, the feed for the
    // products themselves with prices, stock and postage.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/product-feed.xml`],
  };
}
