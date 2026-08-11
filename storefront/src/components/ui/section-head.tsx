import { cn } from "@/lib/utils";

/**
 * The section head used by every band on the site.
 *
 * The old build gave each section a centred-ish stack — gold rule, eyebrow,
 * title, subtitle — which is the marketing-template grammar. This is a sheet
 * header instead: a two-digit index in the margin, the title on a baseline, and
 * a hairline that runs the full width of the band. It reads as a numbered
 * section of a register, which is the same language as the dimension lines on
 * the cards, and it gives every band an unmistakable left (or right, in Arabic)
 * edge to align to.
 */
export function SectionHead({
  index,
  eyebrow,
  title,
  subtitle,
  action,
  className,
}: {
  /** Two-digit section number — the margin annotation. */
  index: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-cream-200 pb-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex min-w-0 items-start gap-4 sm:gap-6">
          <span
            aria-hidden
            className="mt-1.5 shrink-0 text-sm font-bold tabular-nums tracking-[0.2em] text-gold"
          >
            {index}
          </span>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight text-navy sm:text-3xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1.5 max-w-xl text-sm text-muted sm:text-base">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

/** The site's text-link affordance: a label, a rule that fills on hover, an
 *  arrow that steps in the reading direction. Used instead of the old outlined
 *  "View all" buttons — a band should end in a line, not another box. */
export function TextLink({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "group/link inline-flex items-center gap-2.5 text-sm font-bold text-navy transition-colors hover:text-gold",
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className="relative block h-px w-8 bg-cream-300 after:absolute after:inset-y-0 after:start-0 after:w-0 after:bg-gold after:transition-[width] after:duration-300 group-hover/link:after:w-full"
      />
    </span>
  );
}
