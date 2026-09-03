import type { MetadataRoute } from "next";
import { listProducts } from "@/lib/catalog";
import { ARTISTS } from "@/lib/artists";
import { MUSICIANS } from "@/lib/musicians";
import { SITE_URL } from "@/lib/site";

const STATIC_ROUTES = [
  { path: "/", priority: 1 },
  { path: "/shop", priority: 0.9 },
  { path: "/art-collective", priority: 0.8 },
  { path: "/music-collective", priority: 0.8 },
  { path: "/events", priority: 0.8 },
  { path: "/about", priority: 0.7 },
  { path: "/contact", priority: 0.7 },
  { path: "/ambassadors", priority: 0.7 },
  { path: "/apply", priority: 0.6 },
  { path: "/games", priority: 0.6 },
  { path: "/custom-design", priority: 0.6 },
  { path: "/same-same-but-whoa", priority: 0.5 },
  { path: "/shipping-policy", priority: 0.3 },
  { path: "/return-policy", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    priority,
  }));

  // Product/artist/musician listings are live, external data — a failure
  // fetching any of them shouldn't take down the whole sitemap, just omit
  // that section.
  const products = await listProducts({ onlineOnly: true }).catch(() => []);
  for (const product of products) {
    entries.push({ url: `${SITE_URL}/shop/${product.id}`, priority: 0.7 });
  }

  for (const artist of ARTISTS) {
    entries.push({ url: `${SITE_URL}/art-collective/${artist.slug}`, priority: 0.6 });
  }

  for (const musician of MUSICIANS) {
    entries.push({ url: `${SITE_URL}/music-collective/${musician.slug}`, priority: 0.6 });
  }

  return entries;
}
