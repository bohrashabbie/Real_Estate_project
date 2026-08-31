/**
 * Reading a single value out of Next's `searchParams`, shared by every page
 * that seeds itself from the URL (`/properties`, `/smart-search`).
 */

export type SearchParams = Record<string, string | string[] | undefined>;

/** `?a=1&a=2` is a user typing in the URL bar, not a case to model — take the
 *  first value and move on. */
export function one(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}
