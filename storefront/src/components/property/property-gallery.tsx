"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface GalleryImage {
  url: string;
  alt: string;
}

/**
 * The property page's photos: the main one large, the next two beside it,
 * and every one of them opening a full-screen viewer.
 *
 * The small slots crop to fill their shape (`object-fit: cover`), which is
 * right for a photograph of a building and wrong for an office flyer with a
 * phone number along its bottom edge -- the office's own flyers lost exactly
 * that line. The viewer shows each image whole. It is also the only way to
 * reach a fourth photo and beyond: the page has room for three, so the last
 * small slot says how many more there are ("+2") and opens the viewer.
 *
 * Arrows are physical in both directions, following the site's other
 * sliders: left is previous, right is next.
 */
export function PropertyGallery({ images }: { images: GalleryImage[] }) {
  const t = useTranslations("gallery");
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setOpen((index) => (index === null ? index : (index + delta + count) % count)),
    [count],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    // The page behind a full-screen viewer should not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, step]);

  if (count === 0) return null;

  const [primary, ...rest] = images;
  const side = rest.slice(0, 2);
  const hidden = count - 1 - side.length;

  const thumb = (image: GalleryImage, index: number, more = 0) => (
    <button
      key={`${image.url}-${index}`}
      type="button"
      className="gallery-open"
      onClick={() => setOpen(index)}
      aria-label={t("open", { n: index + 1, total: count })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={image.alt} />
      {more > 0 ? <span className="gallery-more">+{more}</span> : null}
    </button>
  );

  return (
    <>
      <section className="container property-gallery">
        <div className="gallery-primary">{thumb(primary, 0)}</div>
        {side.length > 0 ? (
          <div className="gallery-side">
            {side.map((image, i) => thumb(image, i + 1, i === side.length - 1 ? hidden : 0))}
          </div>
        ) : null}
      </section>

      {open !== null ? (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t("viewer")}
          onClick={() => setOpen(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open].url} alt={images[open].alt} onClick={(event) => event.stopPropagation()} />

          <button type="button" className="gallery-close" aria-label={t("close")} onClick={() => setOpen(null)}>
            <X size={20} />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                className="gallery-prev"
                aria-label={t("previous")}
                onClick={(event) => {
                  event.stopPropagation();
                  step(-1);
                }}
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                className="gallery-next"
                aria-label={t("next")}
                onClick={(event) => {
                  event.stopPropagation();
                  step(1);
                }}
              >
                <ChevronRight size={22} />
              </button>
              <span className="gallery-count">
                {open + 1} / {count}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
