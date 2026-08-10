import { useTranslations } from "next-intl";

import type { PropertyStatus } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Status is its own colour family, deliberately kept apart from the brand
   accent — a badge that borrowed the accent would read as promotion rather
   than state. Sold and rented sit at a muted clay so transacted stock stays
   visible in a grid without shouting: a brokerage's recent sales are evidence
   that it sells, and hiding them is a portal's instinct, not an office's. */
const STYLES: Record<PropertyStatus, string> = {
  available: "text-gold",
  rented: "text-state-closed",
  sold: "text-state-closed",
  reserved: "text-state-held",
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
        // Square, hairline, current-colour dot — the badge is drawn, not filled.
        "inline-flex items-center gap-1.5 border border-current bg-cream/85 px-2 py-0.5 text-[11px] font-bold tracking-wide backdrop-blur",
        style,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 bg-current" />
      {t(status)}
    </span>
  );
}
