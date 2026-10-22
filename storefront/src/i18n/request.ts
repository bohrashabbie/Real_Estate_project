import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";

import { withSiteTexts } from "@/lib/site-texts";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const defaults = (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    // With the office's own wording from admin > Website Content.
    messages: await withSiteTexts(defaults, locale),
    // Kuwait, so dates and relative times don't silently render in UTC.
    timeZone: "Asia/Kuwait",
  };
});
