"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/icons";

const AUTOPLAY_MS = 6000;

/** One hero slide with its image URL already resolved — the page decides
 *  whether a slide came from the API (`/uploads/…` on the API origin) or from
 *  the artwork bundled in `public/`, so this component never has to care. */
export interface HeroSlide {
  key: string;
  src: string;
  alt: string;
  href: string | null;
}

/**
 * The home-page hero: whatever the office uploaded in the admin panel.
 *
 * One slide renders as a plain full-bleed rectangle. Two or more turn it into
 * a slider — there is no separate "carousel on/off" setting to keep in sync,
 * the number of live banners *is* the setting. Slides cross-fade rather than
 * translate: a fade needs no directional transform, so it behaves identically
 * under RTL and LTR without mirroring maths.
 *
 * Autoplay pauses on hover, on keyboard focus, while the tab is hidden, and
 * entirely under `prefers-reduced-motion`.
 */
export function HeroBanner({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations("hero");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  // A slider ticking over in a background tab is wasted work and desynced from
  // what the visitor last saw.
  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // An office that hid every banner shouldn't get a blank navy band where the
  // hero used to be.
  if (count === 0) return null;

  return (
    <div
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? t("label") : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        // Edge-to-edge, so `object-cover` and a crop are unavoidable — the
        // only question is how deep. The office's artwork carries its headline
        // between roughly 20% and 76% of its height, so these ratios are the
        // widest ones that still keep that band on screen: phones show the
        // artwork whole, and 5/2 on desktop trims only the decorative gold
        // frame, which reads as a deliberate bleed rather than a bad crop.
        // Going wider (the old 3/1) is what pushed the headline flush against
        // the top edge and cut the call-to-action in half.
        className="relative aspect-[16/9] w-full overflow-hidden bg-navy-950 sm:aspect-[2/1] lg:aspect-[5/2]"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const from = touchStart.current;
          const to = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (from === null || to === undefined || Math.abs(to - from) < 48) return;
          // Swiping left always advances, in both directions of text flow —
          // that is what the gesture means to a phone user either way.
          go(index + (to < from ? 1 : -1));
        }}
      >
        {slides.map((slide, i) => {
          const image = (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover"
              // The first slide is the largest thing above the fold; the rest
              // can wait until the visitor is actually shown them.
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
            />
          );
          return (
            <div
              key={slide.key}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none",
                i === index ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={count > 1 && i !== index}
              // Slides out of view must not be tab stops.
              inert={count > 1 && i !== index}
              role={count > 1 ? "group" : undefined}
              aria-roledescription={count > 1 ? "slide" : undefined}
              aria-label={count > 1 ? `${i + 1} / ${count}` : undefined}
            >
              {slide.href ? (
                <Link href={slide.href} className="block h-full w-full">
                  {image}
                </Link>
              ) : (
                image
              )}
            </div>
          );
        })}

        {/* Every slider control — both arrows and the dots — lives in one bar
            centred on the banner's bottom edge, where a thumb reaches it. Side
            arrows sat at the vertical middle of a full-bleed image, which on a
            phone is the hardest place on the banner to hit. Only earns its
            place once there is somewhere to go. */}
        {count > 1 ? (
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center sm:bottom-6">
            <div className="flex items-center gap-1.5 rounded-full bg-navy-950/45 p-1.5 backdrop-blur">
              <SliderArrow side="start" label={t("previous")} onClick={() => go(index - 1)} />
              <div className="flex items-center gap-2 px-1.5">
                {slides.map((slide, i) => (
                  <button
                    key={slide.key}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={t("goTo", { number: i + 1 })}
                    aria-current={i === index}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      i === index ? "w-7 bg-gold" : "w-2.5 bg-white/70 hover:bg-gold/70",
                    )}
                  />
                ))}
              </div>
              <SliderArrow side="end" label={t("next")} onClick={() => go(index + 1)} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SliderArrow({
  side,
  label,
  onClick,
}: {
  side: "start" | "end";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-gold"
    >
      {/* ArrowIcon points inline-end; the start arrow is its mirror. */}
      <ArrowIcon
        width={16}
        height={16}
        className={cn(side === "start" ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180")}
      />
    </button>
  );
}
