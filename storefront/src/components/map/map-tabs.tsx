"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import {
  KUWAIT_FINDER_ANDROID_URL,
  KUWAIT_FINDER_IOS_URL,
  kuwaitFinderUrl,
} from "@/lib/kuwait-finder";
import { cn } from "@/lib/utils";
import { ExternalIcon, MapIcon, PinIcon } from "@/components/ui/icons";

/**
 * Two ways to look at the same place: the site's own map, and Kuwait Finder.
 *
 * The finder is PACI's official map — the one that knows block, parcel and
 * PACI number — so for a Kuwaiti visitor it is often the more useful of the
 * two, and it gets a tab of its own rather than a link buried under the map.
 *
 * PACI's client is embedded in a frame, but a government host is free to
 * refuse framing, so the "open in Kuwait Finder" button sits *above* the frame
 * and not inside it: if the frame comes up blank, the way through is already
 * on screen rather than something the visitor has to go hunting for.
 */
export function MapTabs({
  latitude,
  longitude,
  mapAction,
  children,
}: {
  latitude?: number | null;
  longitude?: number | null;
  /** Optional control shown beside the tabs on the map tab (e.g. "open in Maps"). */
  mapAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTranslations("finder");
  const [tab, setTab] = useState<"map" | "finder">("map");
  const finderHref = kuwaitFinderUrl(latitude, longitude);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-cream p-1 ring-1 ring-cream-200">
          <TabButton active={tab === "map"} onClick={() => setTab("map")}>
            <MapIcon width={16} height={16} />
            {t("mapTab")}
          </TabButton>
          <TabButton active={tab === "finder"} onClick={() => setTab("finder")}>
            <PinIcon width={16} height={16} />
            {t("finderTab")}
          </TabButton>
        </div>
        {tab === "map" ? mapAction : null}
      </div>

      <div className={cn("mt-4", tab === "map" ? undefined : "hidden")}>{children}</div>

      {tab === "finder" ? (
        <div className="mt-4">
          <a
            href={finderHref}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gold flex items-center justify-center gap-2.5 rounded-2xl px-6 py-3.5 text-base font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.99]"
          >
            {t("openInFinder")}
            <ExternalIcon width={18} height={18} />
          </a>

          <iframe
            src={finderHref}
            title={t("finderTab")}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mt-3 h-80 w-full rounded-2xl border border-cream-200 bg-cream-50 sm:h-96"
          />

          <p className="mt-3 text-sm text-muted">{t("embedNote")}</p>

          <div className="mt-3 flex flex-wrap gap-2.5">
            <a
              href={KUWAIT_FINDER_IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-bold text-navy ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
            >
              {t("iosApp")}
              <ExternalIcon width={14} height={14} className="text-gold" />
            </a>
            <a
              href={KUWAIT_FINDER_ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm font-bold text-navy ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
            >
              {t("androidApp")}
              <ExternalIcon width={14} height={14} className="text-gold" />
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
        active ? "bg-navy text-white shadow-card" : "text-muted hover:text-navy",
      )}
    >
      {children}
    </button>
  );
}
