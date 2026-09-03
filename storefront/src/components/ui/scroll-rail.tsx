"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A horizontal scroll rail with a short bar centred beneath it.
 *
 * The bar is drawn rather than native. A real scrollbar always spans its
 * container's full width — there is no way to shorten or centre one — and
 * `scrollbar-width` stops at `thin`, so "small, in the middle" cannot be
 * asked of the browser's own. It also solves the platform split the native
 * bar had: macOS and iOS fade their overlay scrollbars when idle, so half the
 * visitors would have seen no control at all between scrolls.
 *
 * The track underneath is still a real scroll container — swipe, trackpad,
 * keyboard and momentum all keep working, and the bar reads its position back
 * off `scroll` rather than owning it. Dragging the bar drives `scrollLeft`.
 *
 * RTL: `scrollLeft` starts at 0 on the right edge and runs *negative*
 * leftwards, which is why position is read through `Math.abs` and written
 * back with the sign flipped. The thumb is placed with `inset-inline-start`,
 * so it travels from the same edge the reader starts at in either direction.
 *
 * Server components can render this and pass their cards as `children`, which
 * is what keeps `PropertyCarousel` off the client.
 */
export function ScrollRail({
  className,
  trackClassName,
  ariaLabel,
  children,
}: {
  className: string;
  trackClassName: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  // Share of the content visible at once — the thumb's width, and the test
  // for whether there is anything to scroll at all.
  const [ratio, setRatio] = useState(1);
  const [progress, setProgress] = useState(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setRatio(track.scrollWidth > 0 ? Math.min(1, track.clientWidth / track.scrollWidth) : 1);
    setProgress(max > 1 ? Math.min(1, Math.abs(track.scrollLeft) / max) : 0);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    track.addEventListener("scroll", measure, { passive: true });
    // Cards reflow at every breakpoint and images land late; both change how
    // much of the rail is visible, so the thumb is re-measured rather than
    // sized once on mount.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const seek = useCallback((clientX: number) => {
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return;
    const rect = bar.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === "rtl";
    const travelled = rtl ? rect.right - clientX : clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, travelled / rect.width));
    const max = track.scrollWidth - track.clientWidth;
    track.scrollTo({ left: (rtl ? -1 : 1) * fraction * max, behavior: "auto" });
  }, []);

  if (ratio >= 1) {
    // Nothing to scroll: a bar that cannot move is furniture.
    return (
      <div className={className}>
        <div className={trackClassName} ref={trackRef}>
          {children}
        </div>
      </div>
    );
  }

  const thumbWidth = Math.max(ratio * 100, 12);

  return (
    <div className={className}>
      <div className={trackClassName} ref={trackRef}>
        {children}
      </div>

      <div
        className="rail-bar"
        ref={barRef}
        role="scrollbar"
        aria-label={ariaLabel}
        aria-controls={undefined}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          seek(event.clientX);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) seek(event.clientX);
        }}
      >
        <i
          style={{
            width: `${thumbWidth}%`,
            insetInlineStart: `${progress * (100 - thumbWidth)}%`,
          }}
        />
      </div>
    </div>
  );
}
