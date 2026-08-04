import { useTranslations } from "next-intl";

import type { PropertyStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

const STYLES: Record<PropertyStatus, { pill: string; dot: string }> = {
  available: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  rented: { pill: "bg-red-50 text-red-600", dot: "bg-red-500" },
  sold: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-500" },
  reserved: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
};

export function StatusPill({
  status,
  className,
}: {
  status: PropertyStatus;
  className?: string;
}) {
  const t = useTranslations("status");
  const style = STYLES[status] ?? STYLES.available;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-sm",
        style.pill,
        className,
      )}
    >
      {t(status)}
      <span className={cn("h-2 w-2 rounded-full", style.dot)} />
    </span>
  );
}
