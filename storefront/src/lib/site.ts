/**
 * Public origin the site is served from — the one value that makes canonical
 * URLs, hreflang alternates, OG image URLs, robots.txt and the sitemap
 * absolute rather than path-relative.
 *
 * Set `NEXT_PUBLIC_SITE_URL` per environment (compose passes it as a build arg
 * *and* a runtime env). The localhost fallback only ever applies in dev.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100"
).replace(/\/+$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
