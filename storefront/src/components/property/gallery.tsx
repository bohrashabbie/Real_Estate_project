"use client";

import { useState } from "react";

import { mediaUrl, type PropertyImage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { BuildingIcon } from "@/components/ui/icons";

/** Main image + thumbnail strip. Falls back to a quiet placeholder when the
 *  listing has no photos yet. */
export function Gallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const sorted = [...images].sort(
    (a, b) => Number(b.is_main) - Number(a.is_main) || a.sort_order - b.sort_order,
  );
  const [active, setActive] = useState(0);
  const current = sorted[active];

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-3xl bg-cream-100 text-cream-300 ring-1 ring-cream-200">
        <BuildingIcon width={72} height={72} strokeWidth={1.1} />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-cream-100 ring-1 ring-cream-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediaUrl(current.url) ?? ""}
          alt={current.alt ?? title}
          className="aspect-[4/3] w-full object-cover"
        />
      </div>
      {sorted.length > 1 ? (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {sorted.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={cn(
                "h-20 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition-all",
                index === active ? "ring-gold" : "ring-transparent opacity-70 hover:opacity-100",
              )}
              aria-label={image.alt ?? title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(image.url) ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
