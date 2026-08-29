"use client";

import { useEffect, useRef, useState } from "react";
import { Building2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { PropertyType } from "@/lib/api";

const INTERVAL = 3200;

/**
 * The six-tile "by property type" row, advancing on its own like an ad strip
 * instead of sitting still until someone drags it.
 *
 * It is a real scroll container underneath (native drag/swipe still works,
 * and `scroll-snap` still governs where it rests) — the timer just calls
 * `scrollIntoView` on the next card the same way `VipCarousel`'s arrows do,
 * so it inherits correct behaviour under `dir="rtl"` for free instead of
 * hand-computing a `scrollLeft` sign per direction.
 *
 * A manual drag is tracked back into `index` from scroll position (see the
 * `scroll` listener below) so the timer resumes from wherever the visitor
 * left it rather than snapping back to where autoplay last was.
 */
export function TypeGridSlider({ types }: { types: PropertyType[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || types.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % types.length);
    }, INTERVAL);
    return () => window.clearInterval(id);
  }, [playing, types.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const item = track.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, [index]);

  // A drag or swipe moves the track without going through `setIndex`, so the
  // next timer tick reads its position back off the scroll rather than
  // assuming autoplay was the last thing to move it.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const items = Array.from(track.children) as HTMLElement[];
        if (items.length === 0) return;
        const rtl = getComputedStyle(track).direction === "rtl";
        const box = track.getBoundingClientRect();
        let nearest = 0;
        let shortest = Infinity;
        items.forEach((item, i) => {
          const rect = item.getBoundingClientRect();
          const gap = Math.abs(rtl ? box.right - rect.right : rect.left - box.left);
          if (gap < shortest) {
            shortest = gap;
            nearest = i;
          }
        });
        setIndex(nearest);
      });
    };
    track.addEventListener("scroll", sync, { passive: true });
    return () => {
      track.removeEventListener("scroll", sync);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className="type-grid"
      ref={trackRef}
      // Paused only for an actual drag/touch, not a mouse merely resting
      // over the row — an ad strip like this one keeps moving under a
      // stationary cursor; only pausing for a passing hover would make it
      // look stalled to anyone looking straight at it with a mouse nearby.
      onPointerDown={() => setPlaying(false)}
      onPointerUp={() => setPlaying(true)}
      onPointerCancel={() => setPlaying(true)}
    >
      {types.map((type) => (
        <Link key={type.key} className="type-card" href={`/properties?type=${type.key}`}>
          <span>
            <Building2 size={26} />
          </span>
          <strong>{type.name}</strong>
        </Link>
      ))}
    </div>
  );
}
