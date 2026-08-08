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
      // The navy band is full-bleed; the artwork inside it is not. A banner
      // stretched edge-to-edge can only keep its proportions by growing
      // absurdly tall on a desktop, so the previous letterbox ratios cropped
      // it instead — and the first thing a crop eats is the margin the
      // designer left around the headline and the call-to-action. Capping the
      // width keeps every pixel of the artwork at a height that still leaves
      // room for the search panel below the fold.
      className="bg-navy-950 px-4 pb-16 pt-4 sm:px-6 sm:pb-24 sm:pt-6"
      aria-roledescription={count > 1 ? "carousel" : undefined}
      aria-label={count > 1 ? t("label") : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        // 15/8 is the ratio of the office's artwork, and `object-contain`
        // below means an upload of any other shape letterboxes onto the navy
        // rather than losing the text baked into it.
        className="relative mx-auto aspect-[15/8] w-full max-w-[72rem] overflow-hidden rounded-2xl sm:rounded-3xl"
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
              className="h-full w-full object-contain"
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

        {/* Arrows — only earn their place once there is somewhere to go. */}
        {count > 1 ? (
          <>
            <SliderArrow side="start" label={t("previous")} onClick={() => go(index - 1)} />
            <SliderArrow side="end" label={t("next")} onClick={() => go(index + 1)} />

            {/* Dots sit inside the artwork. The quick search panel now floats
                over the navy band's bottom padding rather than over the image,
                so they no longer need to dodge it. */}
            <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
              <div className="flex gap-2 rounded-full bg-navy-950/40 px-3 py-2 backdrop-blur">
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
            </div>
          </>
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
      className={cn(
        "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy-950/50 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-gold hover:text-white",
        side === "start" ? "start-3 sm:start-6" : "end-3 sm:end-6",
      )}
    >
      {/* ArrowIcon points inline-end; the start arrow is its mirror. */}
      <ArrowIcon
        width={20}
        height={20}
        className={cn(side === "start" ? "rotate-180 rtl:rotate-0" : "rtl:rotate-180")}
      />
    </button>
  );
}
