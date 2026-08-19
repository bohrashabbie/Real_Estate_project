import type { Locale } from "@/i18n/routing";
import type { Purpose } from "@/lib/api";

/**
 * The reference splits its digits by role, and this file keeps that split:
 *
 *   prices and counts of things  →  Arabic-Indic in Arabic (٤٢٠ د.ك، ١٥٨ منطقة)
 *   measurements and specs       →  Latin in both locales (3 غرف، 145 م²)
 *
 * It reads as inconsistent written down and completely natural on the page:
 * a Kuwaiti price is spoken and written in Arabic-Indic, while a room count
 * next to a pictogram is read as a quantity, not as prose.
 */

/** "650" / "85000.000" → "650" / "85,000" — KWD, three-decimal NUMERIC,
 *  trailing fils dropped when zero (the office prices in whole dinars). */
export function formatAmount(value: string | number, locale: Locale = "en"): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value);
  const hasFils = Math.round(numeric * 1000) % 1000 !== 0;
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: hasFils ? 3 : 0,
    maximumFractionDigits: hasFils ? 3 : 0,
  }).format(numeric);
}

/** Rent → "650 KD / month" (٦٥٠ د.ك / شهرياً); sale → "KD 85,000" (٨٥٬٠٠٠ د.ك).
 *  The spaces around the slash are the reference's, and they also give the
 *  string somewhere to wrap in a narrow card rather than overflowing. */
export function formatPrice(price: string | number, purpose: Purpose, locale: Locale): string {
  const amount = formatAmount(price, locale);
  if (purpose === "rent") {
    return locale === "ar" ? `${amount} د.ك / شهرياً` : `${amount} KD / month`;
  }
  return locale === "ar" ? `${amount} د.ك` : `KD ${amount}`;
}

/** Bare price, no unit — the map pin and the compare table set their own. */
export function formatBareAmount(price: string | number, locale: Locale): string {
  return formatAmount(price, locale);
}

/** Counts that read as quantities of a thing: "١٥٨ منطقة", "158 areas". */
export function formatCount(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(value);
}

export function formatSqm(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numeric);
}

/** wa.me links want digits only (no +, spaces or dashes). */
export function waNumber(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function waLink(rawNumber: string, message?: string): string {
  const base = `https://wa.me/${waNumber(rawNumber)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telLink(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

/** "+96597711779" → "+965 97711779", the way the reference prints it in the
 *  header pill and the footer. Anything that is not a Kuwaiti-shaped number
 *  is handed back untouched rather than mangled. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("965") && digits.length === 11) {
    return `+965 ${digits.slice(3)}`;
  }
  return raw.trim();
}
