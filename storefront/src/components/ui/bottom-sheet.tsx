"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { CloseIcon } from "@/components/ui/icons";

/**
 * A panel that rises from the bottom of the viewport.
 *
 * The listing page opens exactly one of these at a time — one filter, rising
 * over the results, which keep updating live behind it. That is why the
 * backdrop is only a dim rather than opaque: the point of the interaction is
 * watching the count change as you tap.
 */
export function BottomSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTranslations("picker");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // The sheet scrolls internally; letting the page scroll behind it drags
    // the results out from under the visitor mid-tap.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="animate-fade-in absolute inset-0 bg-navy/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-slide-up relative flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-cream shadow-float"
      >
        <div className="flex items-start justify-between gap-4 border-b border-cream-200 px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold text-navy">{title}</p>
            {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-card transition-colors hover:bg-cream-100"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <div className="border-t border-cream-200 px-5 py-4">
          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl bg-navy px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-navy-700"
            >
              {t("done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
