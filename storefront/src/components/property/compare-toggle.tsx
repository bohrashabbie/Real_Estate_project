"use client";

import { useTranslations } from "next-intl";
import { Check, GitCompareArrows, Plus } from "lucide-react";

import { useCompare, type CompareEntry } from "@/lib/compare-store";

/** The "قارن / Compare" control in every card footer. */
export function CompareToggle({ property }: { property: CompareEntry }) {
  const t = useTranslations("compare");
  const { items, ready, toggle } = useCompare();
  const active = ready && items.some((item) => item.slug === property.slug);

  return (
    <button
      type="button"
      className={`compare-toggle${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={() => toggle(property)}
    >
      <GitCompareArrows size={15} />
      {active ? <Check size={14} /> : <Plus size={14} />}
      {t("toggle")}
    </button>
  );
}
