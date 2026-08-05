import { Cairo, IBM_Plex_Sans_Arabic } from "next/font/google";

/**
 * Two-tier bilingual pairing. IBM Plex Sans Arabic carries body text — a
 * genuinely well-drawn Arabic with a matching Latin, so running text keeps a
 * single texture in both scripts. Cairo (geometric, high contrast at heavy
 * weights, also dual-script) carries display headlines and prices, giving
 * headings a distinct premium voice without switching mid-word on "KD" or a
 * ref number.
 */
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const fontVariables = `${plexArabic.variable} ${cairo.variable}`;
