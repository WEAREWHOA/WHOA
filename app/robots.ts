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
        "/ssbd-admin",
        "/ssbd-admin/",
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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
