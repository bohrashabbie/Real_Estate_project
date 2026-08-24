"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { mediaUrl, type Banner } from "@/lib/api";

const INTERVAL = 6500;

/**
 * The campaign hero: cross-fading frames behind a fixed headline.
 *
 * The copy does not change with the slide. That is deliberate in the reference
 * and worth keeping — a headline that swaps every six seconds is unreadable,
 * and the photographs are the campaign, not the message.
 *
 * There are two modes, and which one runs is decided by whether the office has
 * published anything in the admin's banner list:
 *
 *   no banners   the four shipped campaign frames, which are plain photography
 *                with a dark scrim, carrying the reference's headline and CTA.
 *   banners      the office's own artwork, shown clean and shown *whole*.
 *                Those banners arrive with their message already set in the
 *                image ("استثمارك يبدأ من هنا"), so painting a second headline
 *                and a scrim over them puts two competing sentences on one
 *                picture — and cropping them to a hero-shaped letterbox cuts
 *                the tagline, the badge and the artwork's own gold frame off
 *                the bottom, which is the same mistake by other means. So in
 *                artwork mode the banner is never cropped: it is fitted whole
 *                into a band that stops growing once the artwork reaches the
 *                site's container width, and the space left beside it on wide
 *                screens is filled by a blurred, darkened copy of that same
 *                banner, so the picture sits in its own colours rather than
 *                between two dead navy slabs. Each slide is therefore a
 *                backdrop + artwork pair that fades as one (see
 *                `.launch-hero.is-artwork` in globals.css); a banner that
 *                carries an `href` becomes the link for its own slide.
 *
 * The rule is simply that whoever wrote the artwork owns the words on it.
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

  const officeArtwork = published.length > 0;
  const slides = officeArtwork ? published.map((banner) => banner.src) : FALLBACK_SLIDES;
  const alts = officeArtwork
    ? published.map((banner) => banner.alt)
    : slides.map(() => t("slideAlt"));

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

  const href = officeArtwork ? published[index]?.href : null;

  const frames = slides.map((src, i) => {
    const active = i === index;
    const image = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={`hero-slide-image${active && !officeArtwork ? " is-active" : ""}`}
        src={src}
        alt={active ? alts[i] : ""}
        fetchPriority={i === 0 ? "high" : "low"}
      />
    );

    // Campaign frames crop to fill, so each one fades on its own. Office
    // artwork is fitted whole, so it travels with the blurred fill that closes
    // the gap beside it and the pair fades together.
    if (!officeArtwork) return <Fragment key={`${i}-${src}`}>{image}</Fragment>;

    return (
      <div key={`${i}-${src}`} className={`hero-artwork-frame${active ? " is-active" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-artwork-backdrop" src={src} alt="" aria-hidden />
        {image}
      </div>
    );
  });

  return (
    <section className={`launch-hero${officeArtwork ? " is-artwork" : ""}`}>
      {frames}

      {/* The link is an overlay, not a wrapper, so it covers the whole band
          without sitting between the section and the frames it lays out. */}
      {href ? (
        <Link className="hero-artwork-link" href={href} aria-label={alts[index]} />
      ) : null}

      {officeArtwork ? null : (
        <>
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
        </>
      )}

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
