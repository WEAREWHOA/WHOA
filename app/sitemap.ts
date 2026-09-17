import type { MetadataRoute } from "next";
import { listProducts, productPath } from "@/lib/catalog";
import { ARTISTS } from "@/lib/artists";
import { MUSICIANS } from "@/lib/musicians";
import { SITE_URL } from "@/lib/site";

// Without this, a sitemap with no dynamic-request APIs (cookies/headers) —
// this one only calls listProducts(), a plain external fetch — gets frozen
// at build time: a new product added in Square wouldn't reach the sitemap,
// and search engines wouldn't discover it, until the next full redeploy.
export const revalidate = 3600;

// Every public route, in the order a person would meet them. No
// <priority> or <changefreq> anywhere in this file: Google announced in
// 2023 that it ignores both, so they were bytes that did nothing. What it
// does read is <lastmod>, which is why products carry theirs from Square.
const STATIC_ROUTES = [
  "/",
  "/shop",
  "/art-collective",
  "/music-collective",
  "/events",
  "/join",
  "/about",
  "/about/story",
  "/podcast",
  "/contact",
  "/faq",
  "/ambassadors",
  "/apply",
  "/sell-for-us",
  "/music-collective/apply",
  "/art-collective/apply",
  "/games",
  "/same-same-but-whoa",
  "/site-concept",
  "/shipping-policy",
  "/return-policy",
  "/privacy-policy",
  "/terms-of-service",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
  }));

  // Product/artist/musician listings are live, external data — a failure
  // fetching any of them shouldn't take down the whole sitemap, just omit
  // that section.
  const products = await listProducts({ onlineOnly: true }).catch(() => []);
  for (const product of products) {
    entries.push({
      url: `${SITE_URL}${productPath(product)}`,
      // Square's own timestamp, so a product whose price or photos changed
      // last week gets re-crawled ahead of one untouched for a year —
      // instead of every URL looking equally stale. Omitted rather than
      // faked with "now" when Square doesn't give us one: a lastmod that
      // always says today teaches Google to stop trusting it.
      lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
      // The photographs are the product for a brand like this one, and
      // image entries are what puts them in Google Images.
      images: product.imageUrls.length > 0 ? product.imageUrls : undefined,
    });
  }

  for (const artist of ARTISTS) {
    entries.push({ url: `${SITE_URL}/art-collective/${artist.slug}` });
  }

  for (const musician of MUSICIANS) {
    entries.push({ url: `${SITE_URL}/music-collective/${musician.slug}` });
  }

  return entries;
}
