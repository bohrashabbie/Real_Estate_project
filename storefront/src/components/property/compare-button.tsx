"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { CompareIcon } from "@/components/ui/icons";

/**
 * The card's "compare" affordance.
 *
 * Side-by-side comparison is not built yet — this announces that in place
 * rather than opening a dead page, using the `card.compareSoon` string the
 * translations have always carried for it. It is deliberately not a link: a
 * link that goes nowhere is worse than a button that says so.
 */
export function CompareButton() {
  const t = useTranslations("card");
  const [announced, setAnnounced] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        setAnnounced(true);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setAnnounced(false), 2500);
      }}
      aria-live="polite"
      className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-navy transition-colors hover:text-gold-dark"
    >
      {announced ? (
        <span className="text-xs font-bold text-gold-dark">{t("compareSoon")}</span>
      ) : (
        <>
          <span aria-hidden>+</span>
          {t("compare")}
          <CompareIcon width={16} height={16} className="text-gold" />
        </>
      )}
    </button>
  );
}
