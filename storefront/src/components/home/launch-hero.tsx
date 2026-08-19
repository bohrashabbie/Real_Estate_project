"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { mediaUrl, type Banner } from "@/lib/api";

const INTERVAL = 6500;

/**
 * The campaign hero: four cross-fading photographs behind one fixed headline.
 *
 * The copy does not change with the slide. That is deliberate in the reference
 * and worth keeping — a headline that swaps every six seconds is unreadable,
 * and the photographs are the campaign, not the message.
 *
 * Slides come from the admin's banner list when the office has published any,
 * and fall back to the four shipped campaign frames when it has not, so the
 * hero is never an empty navy box.
 */
const FALLBACK_SLIDES = [
  "/hero/campaign-smart-search.webp",
  "/hero/campaign-compare.webp",
  "/hero/campaign-map.webp",
  "/hero/campaign-properties.webp",
];

export function LaunchHero({ banners }: { banners: Banner[] }) {
  const t = useTranslations("hero");
  const published = banners
    .map((banner) => ({ ...banner, src: mediaUrl(banner.image_url) }))
    .filter((banner): banner is Banner & { src: string } => Boolean(banner.src));
  const slides = published.length > 0 ? published.map((banner) => banner.src) : FALLBACK_SLIDES;
  const alts =
    published.length > 0 ? published.map((banner) => banner.alt) : slides.map(() => t("slideAlt"));

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    timer.current = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, slides.length]);

  // Someone who asked for less motion gets the first frame and no rotation.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  return (
    <section className="launch-hero">
      {slides.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          className={`hero-slide-image${i === index ? " is-active" : ""}`}
          src={src}
          alt={i === index ? alts[i] : ""}
          fetchPriority={i === 0 ? "high" : "low"}
        />
      ))}

      <div className="hero-overlay" aria-hidden />
      <span className="hero-match-badge" aria-hidden>
        {t("matchBadge")}
      </span>

      <div className="container launch-hero-content">
        <span className="eyebrow light-eyebrow">
          <Sparkles size={15} />
          {t("eyebrow")}
        </span>
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <div className="hero-actions">
          <Link className="button button-gold button-large" href="/smart-search">
            <ArrowLeft size={16} />
            {t("cta")}
          </Link>
        </div>
      </div>

      {slides.length > 1 ? (
        <div className="container slider-controls">
          <button type="button" aria-label={t("previous")} onClick={() => go(index - 1)}>
            <ChevronLeft size={16} />
          </button>
          <div>
            {slides.map((src, i) => (
              <button
                key={src}
                type="button"
                className={i === index ? "is-active" : undefined}
                aria-label={t("goToSlide", { number: i + 1 })}
                aria-current={i === index}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button type="button" aria-label={t("next")} onClick={() => go(index + 1)}>
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            aria-label={playing ? t("pause") : t("play")}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      ) : null}
    </section>
  );
}
