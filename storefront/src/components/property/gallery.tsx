"use client";

import { useState } from "react";

import { mediaUrl, type PropertyImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BuildingIcon } from "@/components/ui/icons";

/**
 * Main plate + filmstrip.
 *
 * Restyled to the rest of the system: square, hairline-bordered, and carrying a
 * plate counter in the corner the way a contact sheet is numbered. The rings
 * and 24px corners it used to have were the last rounded surfaces on the site.
 */
export function Gallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const sorted = [...images].sort(
    (a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order,
  );
  const [active, setActive] = useState(0);
  const current = sorted[active];

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center border border-cream-200 bg-cream-100 text-cream-300">
        <BuildingIcon width={72} height={72} strokeWidth={1.1} />
      </div>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden bg-cream-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(current.url) ?? ""}
          alt={current.alt ?? title}
          fetchPriority="high"
          className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
        />
        {sorted.length > 1 ? (
          <span className="absolute end-3 top-3 bg-cream/85 px-2.5 py-1 text-[11px] font-bold tabular-nums tracking-wider text-navy backdrop-blur">
            {String(active + 1).padStart(2, "0")} / {String(sorted.length).padStart(2, "0")}
          </span>
        ) : null}
      </div>

      {sorted.length > 1 ? (
        <div className="mt-px flex gap-px overflow-x-auto bg-cream-200 pb-px">
          {sorted.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={index === active}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden bg-cream-100 transition-opacity sm:h-20 sm:w-28",
                index === active ? "opacity-100" : "opacity-55 hover:opacity-90",
              )}
              aria-label={image.alt ?? title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(image.url) ?? ""}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {/* The active plate is marked by a rule along its top edge —
                  the same annotation the dimension cells use. */}
              {index === active ? (
                <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gold" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
