"use client";

import { useTranslations } from "next-intl";
import { GitCompareArrows, X } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { useCompare } from "@/lib/compare-store";

/**
 * The docked bar that appears as soon as anything is shortlisted.
 *
 * It hides itself on `/compare`, where it would sit on top of the table it is
 * offering to open.
 */
export function CompareBar() {
  const t = useTranslations("compare");
  const pathname = usePathname();
  const { items, ready, clear } = useCompare();

  if (!ready || items.length === 0 || pathname.startsWith("/compare")) return null;

  return (
    <div className="compare-bar" role="region" aria-label={t("barAria")}>
      <span className="compare-bar-icon">
        <GitCompareArrows size={19} />
      </span>
      <div>
        <strong>{t("count", { count: items.length })}</strong>
        <span>{t("hint")}</span>
      </div>
      <div className="compare-thumbs">
        {items.map((item) =>
          item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={item.slug} src={item.image} alt="" />
          ) : (
            <i key={item.slug} aria-hidden />
          ),
        )}
      </div>
      <Link className="button button-gold small-button" href="/compare">
        {t("open")}
      </Link>
      <button type="button" className="compare-clear" aria-label={t("clear")} onClick={clear}>
        <X size={16} />
      </button>
    </div>
  );
}
