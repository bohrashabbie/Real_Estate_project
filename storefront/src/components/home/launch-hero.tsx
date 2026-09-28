"use client";

import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { mediaUrl, siteText, type Banner, type SiteSettings } from "@/lib/api";
import type { Locale } from "@/i18n/routing";

const INTERVAL = 6500;

/** The artwork hero's box (`.launch-hero.is-artwork` in globals.css). */
const HERO_RATIO = 2.8;
/** How far off that shape a banner can be and still fill the box. The
 *  office's 3:1 artwork is ~7% off and fills it, as it always has; a square
 *  flyer is ~64% off and is shown whole instead of cropped to a strip. */
const SHAPE_TOLERANCE = 0.15;

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
 *                the bottom, which is the same mistake by other means. So the
 *                banner is shown plainly: full width, its own proportions,
 *                nothing added beside it and nothing taken off it (see
 *                `.launch-hero.is-artwork` in globals.css). A banner that
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

export function LaunchHero({
  banners,
  settings,
  locale,
}: {
  banners: Banner[];
  settings: SiteSettings;
  locale: Locale;
}) {
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

  // Banners that don't match the hero's shape are shown whole instead of
  // cropped. Measured from each image once it loads; until then every slide
  // assumes it fits, which is true of the office's usual 3:1 artwork.
  const [contained, setContained] = useState<Record<number, boolean>>({});
  const measureImage = useCallback((i: number, image: HTMLImageElement) => {
    const { naturalWidth, naturalHeight } = image;
    if (!naturalWidth || !naturalHeight) return;
    const offShape = Math.abs(naturalWidth / naturalHeight / HERO_RATIO - 1) > SHAPE_TOLERANCE;
    setContained((current) => (current[i] === offShape ? current : { ...current, [i]: offShape }));
  }, []);
  const measure = (i: number) => (event: SyntheticEvent<HTMLImageElement>) =>
    measureImage(i, event.currentTarget);
  // An image that finished loading before the page hydrated never fires
  // `onLoad` for React, so it is measured on mount as well.
  const measureIfLoaded = (i: number) => (image: HTMLImageElement | null) => {
    if (image?.complete) measureImage(i, image);
  };

  const frames = officeArtwork
    ? slides.map((src, i) => (
        <div
          key={`${i}-${src}`}
          className={`hero-artwork-frame${i === index ? " is-active" : ""}${
            contained[i] ? " is-contained" : ""
          }`}
        >
          {/* A blurred, darkened copy fills the space around a banner shown
              whole, so an off-shape upload reads as framed, not broken. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-artwork-backdrop" src={src} alt="" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="hero-artwork-image"
            src={src}
            alt={i === index ? alts[i] : ""}
            fetchPriority={i === 0 ? "high" : "low"}
            ref={measureIfLoaded(i)}
            onLoad={measure(i)}
          />
        </div>
      ))
    : slides.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${i}-${src}`}
          className={`hero-slide-image${i === index ? " is-active" : ""}`}
          src={src}
          alt={i === index ? alts[i] : ""}
          fetchPriority={i === 0 ? "high" : "low"}
        />
      ));

  return (
    <section className={`launch-hero${officeArtwork ? " is-artwork" : ""}`}>
      {frames}

      {/* The link is an overlay, not a wrapper: the images are what give the
          hero its height, and wrapping them in a positioned element would
          take that away. */}
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
            <h1>{siteText(settings, "hero_title", locale) ?? t("title")}</h1>
            <p>{siteText(settings, "hero_subtitle", locale) ?? t("subtitle")}</p>
            <div className="hero-actions">
              <Link className="button button-gold button-large" href="/smart-search">
                <ArrowLeft size={16} />
                {siteText(settings, "hero_cta", locale) ?? t("cta")}
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
