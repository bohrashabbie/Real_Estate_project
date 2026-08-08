import type { MetadataRoute } from "next";

import { locales } from "@/i18n/routing";
import { getProperties } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

// Slugs change whenever the office edits a listing title, so the sitemap is
// rendered per request rather than frozen at build time (the build runs with
// no API reachable anyway).
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATIC_PATHS = ["", "/properties", "/smart-search", "/map", "/request", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((other) => [other, absoluteUrl(`/${other}${path}`)]),
          ),
        },
      });
    }
  }

  // Listings, per locale — each locale has its own slug for the same property.
  // `/properties` caps `limit` at 100, so walk the cursor. `getProperties`
  // never throws; a dead API just yields a static-pages-only sitemap instead
  // of a 500. MAX_PAGES stops a runaway loop if a cursor ever fails to advance.
  const PAGE_SIZE = 100;
  const MAX_PAGES = 50;

  for (const locale of locales) {
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result: Awaited<ReturnType<typeof getProperties>> = await getProperties(locale, {
        limit: PAGE_SIZE,
        cursor,
      });
      for (const property of result.items) {
        if (!property.slug) continue;
        entries.push({
          url: absoluteUrl(`/${locale}/properties/${encodeURIComponent(property.slug)}`),
          lastModified: property.published_at ? new Date(property.published_at) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
      if (!result.next_cursor) break;
      cursor = result.next_cursor;
    }
  }

  return entries;
}
