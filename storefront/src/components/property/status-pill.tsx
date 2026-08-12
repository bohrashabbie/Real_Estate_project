import { useTranslations } from "next-intl";

import type { PropertyStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STYLES: Record<PropertyStatus, { pill: string; dot: string }> = {
  available: { pill: "bg-green-50 text-green-700", dot: "bg-green-500" },
  rented: { pill: "bg-red-50 text-red-600", dot: "bg-red-500" },
  sold: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-500" },
  reserved: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

/**
 * `tone="pill"` is the standalone badge used on the detail page.
 *
 * `tone="onPhoto"` is what the listing card uses: bare white type with the
 * status dot, sitting straight on the photo. A tinted pill there fights the
 * "distinct" badge in the opposite corner for attention, and the photo already
 * carries a legibility gradient behind it.
 */
export function StatusPill({
  status,
  tone = "pill",
  className,
}: {
  status: PropertyStatus;
  tone?: "pill" | "onPhoto";
  className?: string;
}) {
  const t = useTranslations("status");
  const style = STYLES[status] ?? STYLES.available;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-xs font-bold",
        tone === "pill"
          ? cn("rounded-full px-3.5 py-1.5 shadow-sm", style.pill)
          : "text-white drop-shadow",
        className,
      )}
    >
      {t(status)}
      <span className={cn("h-2 w-2 rounded-full", style.dot)} />
    </span>
  );
}
