import { Noto_Kufi_Arabic, Noto_Sans_Arabic } from "next/font/google";

/**
 * The reference design's pairing, read off the deployed preview rather than
 * chosen: Noto Kufi Arabic carries every heading, price and button label, and
 * Noto Sans Arabic carries running text. Both are dual-script, so a heading
 * does not switch typeface mid-word on "KD" or a ref number.
 *
 * Kufi is used at weight 400 for large headings there — the size does the
 * work, not the weight — so the light weights are loaded too, which the old
 * Cairo pairing (600 and up) did not need.
 */
export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-arabic",
  display: "swap",
});

export const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-kufi-arabic",
  display: "swap",
});

export const fontVariables = `${notoSansArabic.variable} ${notoKufiArabic.variable}`;
