import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/icons";

export interface IndexEntry {
  href: string;
  label: string;
}

/**
 * A table-of-contents index: number, name, a leader rule, an arrow.
 *
 * This is what replaced the row of rounded icon tiles ("Browse by type") and
 * the areas grid. Those tiles gave every area the same weight as a photograph
 * while carrying no information beyond its name, and cost a full band of the
 * page to do it. An index says the same thing in a third of the height, scales
 * to fifty areas without turning into a wall, and reads as the contents page of
 * a register — which is what the rest of the system is drawn as.
 *
 * The leader rule is the hover target: it fills with the accent left-to-right
 * (right-to-left in Arabic, since it is a flex child in a mirrored container).
 */
export function IndexList({
  entries,
  columns = 1,
  emptyLabel,
}: {
  entries: IndexEntry[];
  columns?: 1 | 2;
  emptyLabel?: string;
}) {
  if (entries.length === 0) {
    return emptyLabel ? <p className="py-4 text-sm text-muted">{emptyLabel}</p> : null;
  }

  return (
    <ul className={cn("grid gap-x-10", columns === 2 && "sm:grid-cols-2")}>
      {entries.map((entry, i) => (
        <li key={entry.href} className="border-t border-cream-200">
          <Link
            href={entry.href}
            className="group/entry flex items-center gap-3 py-3 sm:gap-4"
          >
            <span
              aria-hidden
              className="w-6 shrink-0 text-[11px] font-bold tabular-nums tracking-[0.14em] text-cream-300 transition-colors group-hover/entry:text-gold"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="shrink-0 text-sm font-bold text-navy transition-colors group-hover/entry:text-gold sm:text-base">
              {entry.label}
            </span>
            <span
              aria-hidden
              className="relative block h-px min-w-4 flex-1 bg-cream-200 after:absolute after:inset-y-0 after:start-0 after:w-0 after:bg-gold after:transition-[width] after:duration-500 after:ease-out group-hover/entry:after:w-full"
            />
            <ArrowIcon
              width={15}
              height={15}
              className="shrink-0 text-cream-300 transition-colors group-hover/entry:text-gold rtl:rotate-180"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
