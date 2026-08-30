"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * The opening title card: the mark on navy, three lines of the office's own
 * copy, and a progress bar that runs once.
 *
 * It shows on the first view of a session and never again — `sessionStorage`,
 * not `localStorage`, because "I have seen this" should expire with the tab,
 * not persist for a year. Anyone who asks for reduced motion, and anyone
 * arriving with JavaScript already hydrated on a later navigation, skips it.
 *
 * The element is rendered, not the page's content, so it cannot delay anything:
 * the site is fully painted underneath and the card simply lifts off it.
 */
const DURATION = 2600;

export function BrandIntro() {
  const t = useTranslations("intro");
  const [phase, setPhase] = useState<"hidden" | "playing" | "leaving">("hidden");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem("kwt25:intro") === "seen") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem("kwt25:intro", "seen");
      return;
    }

    window.sessionStorage.setItem("kwt25:intro", "seen");
    setPhase("playing");

    const leave = window.setTimeout(() => setPhase("leaving"), DURATION);
    const done = window.setTimeout(() => setPhase("hidden"), DURATION + 600);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`brand-intro${phase === "leaving" ? " is-leaving" : ""}`}
      role="status"
      aria-label={t("aria")}
    >
      <div className="brand-intro-glow" aria-hidden />
      <div className="brand-intro-content">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/intro-logo.webp" alt={t("logoAlt")} />
        <div className="brand-intro-lines">
          <p className="intro-line-primary">{t("primary")}</p>
          <p className="intro-line-trust">{t("trust")}</p>
          <p className="intro-line-management">{t("management")}</p>
        </div>
        <div className="brand-intro-progress">
          <i />
        </div>
      </div>
    </div>
  );
}
