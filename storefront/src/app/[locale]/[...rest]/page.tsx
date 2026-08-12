import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/**
 * Catch-all for URLs under a locale that match nothing else.
 *
 * Without it, a mistyped address falls through to Next's built-in 404, which
 * renders outside `[locale]/layout.tsx` — no header, no footer, and no way
 * back to the site at all. Calling `notFound()` from inside the segment hands
 * the visitor `[locale]/not-found.tsx` instead, wrapped in the normal chrome.
 *
 * Specific routes win over a catch-all in the App Router, so this cannot
 * shadow `/properties`, `/map` and friends.
 */
export const dynamic = "force-dynamic";

export default async function CatchAllNotFound({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  notFound();
}
