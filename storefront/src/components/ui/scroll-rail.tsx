"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Never thinner than a grabbable sliver, however long the row is. */
function thumbPercent(ratio: number) {
  return Math.max(ratio * 100, 12);
}

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

  /** Where the pointer took hold of the thumb, so a drag moves the thumb by
   *  the pointer's delta instead of teleporting its edge to the cursor —
   *  which is how a real scrollbar behaves, and the behaviour asked for. */
  const grab = useRef(0);

  /** Reads the geometry both handlers need. Measured per event rather than
   *  cached: the thumb's width changes with the viewport. */
  const geometry = useCallback(() => {
    const track = trackRef.current;
    const bar = barRef.current;
    if (!track || !bar) return null;
    const rect = bar.getBoundingClientRect();
    // Same figure the thumb is rendered at, so the hit test and the paint
    // cannot drift apart.
    const thumb = (rect.width * thumbPercent(ratio)) / 100;
    return {
      track,
      rect,
      thumb,
      travel: Math.max(1, rect.width - thumb),
      max: Math.max(0, track.scrollWidth - track.clientWidth),
      rtl: getComputedStyle(track).direction === "rtl",
    };
  }, [ratio]);

  const moveTo = useCallback(
    (clientX: number) => {
      const g = geometry();
      if (!g) return;
      // Distance along the bar from the edge the reader starts at.
      const along = g.rtl ? g.rect.right - clientX : clientX - g.rect.left;
      const start = Math.max(0, Math.min(g.travel, along - grab.current));
      // Direct assignment, not scrollTo({behavior}): the thumb has to keep
      // up with the pointer, and a smooth scroll would lag behind it.
      g.track.scrollLeft = (g.rtl ? -1 : 1) * (start / g.travel) * g.max;
    },
    [geometry],
  );

  const start = useCallback(
    (clientX: number) => {
      const g = geometry();
      if (!g) return;
      const along = g.rtl ? g.rect.right - clientX : clientX - g.rect.left;
      const thumbStart = progress * g.travel;
      // On the thumb: keep the offset it was grabbed by. Anywhere else on the
      // bar: jump, centring the thumb under the pointer, as clicking a
      // scrollbar's track does.
      grab.current =
        along >= thumbStart && along <= thumbStart + g.thumb
          ? along - thumbStart
          : g.thumb / 2;
      moveTo(clientX);
    },
    [geometry, moveTo, progress],
  );

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

  const thumbWidth = thumbPercent(ratio);

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
          // Scroll first, capture second, and never let a refused capture
          // take the scroll with it: `setPointerCapture` throws on an
          // unexpected pointer id, and doing it first meant a click that
          // hit that case did nothing at all.
          start(event.clientX);
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Dragging outside the bar just won't track; the click still took.
          }
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0) return;
          moveTo(event.clientX);
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
