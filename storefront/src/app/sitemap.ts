import type { MetadataRoute } from "next";

import { locales } from "@/i18n/routing";
import { getProperties, getSettings } from "@/lib/api";
import { absoluteUrl } from "@/lib/site";

// Slugs change whenever the office edits a listing title, so the sitemap is
// rendered per request rather than frozen at build time (the build runs with
// no API reachable anyway).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// When this server process started, which is when the current build was
// deployed. Module scope, so it is fixed for the life of the process rather
// than "now" on every request -- a sitemap claiming every page changed a
// second ago teaches crawlers to ignore its dates.
const DEPLOYED_AT = new Date();

// `/compare` is deliberately absent: it renders one browser's own shortlist,
// so there is nothing there for a crawler to index.
const STATIC_PATHS = [
  "",
  "/properties",
  "/smart-search",
  "/map",
  "/request",
  "/list-property",
  "/contact",
];

function latest(...dates: (Date | null | undefined)[]): Date {
  return new Date(Math.max(...dates.filter((d): d is Date => Boolean(d)).map((d) => d.getTime())));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Every page shows the header and footer, so a new phone or WhatsApp number
  // saved in admin Settings -- or a new deploy -- is a change to every page.
  // Stating that is what prompts search engines to re-read them and replace
  // what they have cached. Before this, the static pages carried no date at
  // all and listings only their publish date, so a changed number never
  // registered as a change anywhere.
  const settings = await getSettings();
  const settingsChanged = settings.updated_at ? new Date(settings.updated_at) : null;
  const siteChanged = latest(DEPLOYED_AT, settingsChanged);

  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: siteChanged,
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
          lastModified: latest(
            property.published_at ? new Date(property.published_at) : null,
            siteChanged,
          ),
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
