import { IBM_Plex_Sans_Arabic } from "next/font/google";

/**
 * One face for both scripts. IBM Plex Sans Arabic has a genuinely well-drawn
 * Arabic and a matching Latin, so the bilingual UI keeps a single texture
 * instead of visibly switching families on a ref number or "KD".
 */
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export const fontVariables = plexArabic.variable;
