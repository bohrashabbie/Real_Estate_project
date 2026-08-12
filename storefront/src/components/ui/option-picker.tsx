"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "@/components/ui/icons";

export interface PickerOption {
  value: string;
  label: string;
  /** Optional trailing note — the area list uses it for a count. */
  hint?: string;
}

/**
 * The site's one way of drawing a list of filter options.
 *
 * It is always a **two-column grid**, never a single stacked column: at phone
 * width a one-per-row list pushes the fourth option below the fold and turns
 * picking an area into a scroll hunt. Everything that offers options renders
 * through this — the home quick search (inside `OptionPicker`) and every
 * listing filter (inside a `BottomSheet`) — so the two cannot drift apart.
 *
 * `multiple` toggles values and leaves the list open; single-select replaces
 * the value and reports the pick through `onPicked`, which is what lets the
 * listing page close a sheet the moment a choice is made.
 */
export function OptionGrid({
  options,
  value,
  onChange,
  multiple = false,
  searchable = false,
  searchLabel,
  allLabel,
  allHint,
  emptyLabel,
  onPicked,
}: {
  options: PickerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  searchable?: boolean;
  searchLabel?: string;
  /** Label of the leading "everything" row, which spans both columns. */
  allLabel: string;
  allHint?: string;
  /** Shown instead of the grid when there is nothing to offer at all. */
  emptyLabel?: string;
  onPicked?: () => void;
}) {
  const t = useTranslations("picker");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  function toggle(optionValue: string) {
    if (multiple) {
      onChange(
        value.includes(optionValue)
          ? value.filter((v) => v !== optionValue)
          : [...value, optionValue],
      );
      return;
    }
    onChange(value.includes(optionValue) ? [] : [optionValue]);
    onPicked?.();
  }

  if (options.length === 0 && emptyLabel) {
    return <p className="px-2 py-4 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div>
      {searchable ? (
        <label className="mb-2.5 flex items-center gap-2 rounded-xl border border-cream-200 bg-white px-3.5 py-2.5">
          <SearchIcon width={17} height={17} className="shrink-0 text-gold" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel ?? t("search")}
            className="w-full bg-transparent text-sm font-semibold text-navy outline-none placeholder:font-medium placeholder:text-muted/70"
          />
        </label>
      ) : null}

      {/* "Everything" spans both columns — it is the reset, not a peer of the
          individual options. */}
      <OptionRow
        label={allLabel}
        hint={allHint}
        selected={value.length === 0}
        onClick={() => {
          onChange([]);
          if (!multiple) onPicked?.();
        }}
        className="mb-2 w-full"
      />

      <div className="grid grid-cols-2 gap-2">
        {visible.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            hint={option.hint}
            selected={value.includes(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="px-2 py-4 text-center text-sm text-muted">{t("noMatches")}</p>
      ) : null}
    </div>
  );
}

/**
 * A labelled field that expands into an `OptionGrid` in place — the home quick
 * search's control. The listing page uses `BottomSheet` + `OptionGrid` instead,
 * so the options themselves look identical in both.
 */
export function OptionPicker({
  icon,
  label,
  options,
  value,
  onChange,
  placeholder,
  searchable = false,
  multiple = false,
  allLabel,
  allHint,
  className,
}: {
  icon?: React.ReactNode;
  label: string;
  options: PickerOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Shown as the field's value when nothing is selected. */
  placeholder: string;
  searchable?: boolean;
  multiple?: boolean;
  allLabel?: string;
  allHint?: string;
  className?: string;
}) {
  const t = useTranslations("picker");
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  // Clicking elsewhere or pressing Escape closes the list, the same as a
  // native select — without this every field opened stays open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label);

  return (
    <div
      ref={rootRef}
      className={cn(
        "self-start rounded-2xl border border-cream-200 bg-cream-50 transition-colors",
        open ? "border-gold bg-white" : undefined,
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            {icon ? <span className="text-gold">{icon}</span> : null}
            {label}
          </span>
          <span
            className={cn(
              "mt-0.5 block truncate text-base font-bold",
              selectedLabels.length > 0 ? "text-navy" : "text-navy/70",
            )}
          >
            {selectedLabels.length > 0 ? selectedLabels.join("، ") : placeholder}
          </span>
        </span>
        <ChevronDownIcon
          width={16}
          height={16}
          className={cn("shrink-0 text-gold transition-transform", open ? "rotate-180" : undefined)}
        />
      </button>

      {open ? (
        <div id={panelId} className="max-h-80 overflow-y-auto border-t border-cream-200 p-2.5">
          <OptionGrid
            options={options}
            value={value}
            onChange={onChange}
            multiple={multiple}
            searchable={searchable}
            searchLabel={t("searchPlaceholder", { field: label })}
            allLabel={allLabel ?? placeholder}
            allHint={allHint}
            onPicked={() => setOpen(false)}
          />
          {multiple ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2.5 w-full rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-700"
            >
              {t("done")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function OptionRow({
  label,
  hint,
  selected,
  onClick,
  className,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-start text-sm font-bold transition-colors",
        selected
          ? "border-gold bg-gold-100 text-navy"
          : "border-cream-200 bg-white text-navy hover:border-gold/60 hover:bg-cream-50",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint ? <span className="shrink-0 text-xs font-semibold text-muted">{hint}</span> : null}
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-gold bg-gold text-white"
            : "border-cream-300 bg-cream-50 text-transparent",
        )}
      >
        <CheckIcon width={12} height={12} strokeWidth={3} />
      </span>
    </button>
  );
}
