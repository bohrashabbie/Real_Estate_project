import type { Locale } from "@/i18n/routing";
import type { Purpose } from "@/lib/api";

/** "650" / "85000.000" → "650" / "85,000" — KWD, three-decimal NUMERIC,
 *  trailing fils dropped when zero (the office prices in whole dinars). */
export function formatAmount(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value);
  const hasFils = Math.round(numeric * 1000) % 1000 !== 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasFils ? 3 : 0,
    maximumFractionDigits: hasFils ? 3 : 0,
  }).format(numeric);
}

/** Rent → "650 KD / month" (٦٥٠ د.ك / شهرياً); sale → "KD 85,000". The spaces
 *  around the slash are the reference design's, and they also give the string
 *  somewhere to wrap in a narrow card rather than overflowing. */
export function formatPrice(price: string | number, purpose: Purpose, locale: Locale): string {
  const amount = formatAmount(price);
  if (purpose === "rent") {
    return locale === "ar" ? `${amount} د.ك / شهرياً` : `${amount} KD / month`;
  }
  return locale === "ar" ? `${amount} د.ك` : `KD ${amount}`;
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
