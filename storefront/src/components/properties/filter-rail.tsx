"use client";

import { useTranslations } from "next-intl";

import type { Area, PropertyType } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckIcon, ResetIcon } from "@/components/ui/icons";
import {
  EMPTY_FILTERS,
  STATUS_OPTIONS,
  countActive,
  type Filters,
} from "@/components/properties/filter-state";

/**
 * The filter rail.
 *
 * Filters used to be a full-width accordion sitting *above* the results: on
 * open it took more than a screen, on close it hid the whole search, and either
 * way the first property was pushed below the fold. As a rail beside the
 * results they are permanently visible and permanently out of the way — the
 * visitor sees what is filtered and what came back at the same time, which is
 * the entire point of filtering.
 *
 * The rail is one column of controls with no boxes: each group is a small
 * label, a set of choices, and a hairline. It mirrors to the right-hand side
 * under Arabic on its own, because the page grid is what places it and every
 * spacing token here is logical (`ps`/`pe`/`border-s`).
 *
 * The same component is what the mobile drawer renders, so there is one set of
 * controls to keep correct rather than two.
 */
export function FilterRail({
  areas,
  types,
  filters,
  onChange,
}: {
  areas: Area[];
  types: PropertyType[];
  filters: Filters;
  onChange: (next: Filters | ((current: Filters) => Filters)) => void;
}) {
  const t = useTranslations();
  const active = countActive(filters);

  const activePurpose = filters.purposes.length === 1 ? filters.purposes[0] : "all";

  // Sale money is a different order of magnitude to rent, so the brackets
  // follow whichever purpose is selected.
  const priceBrackets =
    activePurpose === "sale"
      ? [
          { min: "", max: "100000" },
          { min: "100000", max: "250000" },
          { min: "250000", max: "500000" },
          { min: "500000", max: "" },
        ]
      : [
          { min: "", max: "300" },
          { min: "300", max: "500" },
          { min: "500", max: "1000" },
          { min: "1000", max: "" },
        ];

  // Must not be `toLocaleString()` with no locale: Node picks the server's
  // default and the browser the visitor's, so an ar-KW visitor got Arabic-Indic
  // digits against Latin ones in the HTML and React threw a hydration mismatch.
  const bracketLabel = (bracket: { min: string; max: string }) =>
    bracket.min && bracket.max
      ? `${formatAmount(bracket.min)}–${formatAmount(bracket.max)}`
      : bracket.max
        ? t("filters.priceUpTo", { value: formatAmount(bracket.max) })
        : t("filters.priceAtLeast", { value: formatAmount(bracket.min) });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-cream-200 pb-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          {t("filters.title")}
          {active > 0 ? <span className="ms-2 text-gold">{active}</span> : null}
        </span>
        {active > 0 ? (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted transition-colors hover:text-gold"
          >
            <ResetIcon width={14} height={14} />
            {t("filters.clearAll")}
          </button>
        ) : null}
      </div>

      {/* Purpose ------------------------------------------------------------ */}
      <Group label={t("filters.purpose")}>
        <div className="grid grid-cols-2 gap-1.5">
          {(["rent", "sale"] as const).map((purpose) => {
            const on = filters.purposes.includes(purpose);
            return (
              <button
                key={purpose}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  onChange((f) => ({
                    ...f,
                    purposes: on
                      ? f.purposes.filter((p) => p !== purpose)
                      : [...f.purposes, purpose],
                  }))
                }
                className={cn(
                  "border px-3 py-2 text-xs font-bold transition-colors",
                  on
                    ? "border-gold bg-gold-100 text-navy"
                    : "border-cream-200 text-muted hover:border-gold/60 hover:text-navy",
                )}
              >
                {t(`purpose.${purpose}`)}
              </button>
            );
          })}
        </div>
      </Group>

      {/* Area — a single-select list, because the API takes one area --------- */}
      <Group label={t("filters.area")}>
        {areas.length === 0 ? (
          <p className="text-sm text-muted">{t("filters.noAreas")}</p>
        ) : (
          <div className="-me-1 max-h-64 overflow-y-auto pe-1">
            <ChoiceRow
              label={t("filters.allAreas")}
              selected={!filters.area}
              onClick={() => onChange((f) => ({ ...f, area: "" }))}
            />
            {areas.map((area) => (
              <ChoiceRow
                key={area.slug}
                label={area.name}
                selected={filters.area === area.slug}
                onClick={() =>
                  onChange((f) => ({
                    ...f,
                    area: f.area === area.slug ? "" : area.slug,
                  }))
                }
              />
            ))}
          </div>
        )}
      </Group>

      {/* Property type ------------------------------------------------------ */}
      <Group label={t("filters.propertyType")}>
        {types.length === 0 ? (
          <p className="text-sm text-muted">{t("filters.noTypes")}</p>
        ) : (
          types.map((type) => (
            <CheckRow
              key={type.key}
              label={type.name}
              checked={filters.types.includes(type.key)}
              onChange={(checked) =>
                onChange((f) => ({
                  ...f,
                  types: checked
                    ? [...f.types, type.key]
                    : f.types.filter((k) => k !== type.key),
                }))
              }
            />
          ))
        )}
      </Group>

      {/* Price -------------------------------------------------------------- */}
      <Group label={t("filters.price")}>
        <div className="grid grid-cols-2 gap-1.5">
          <Pill
            label={t("filters.any")}
            selected={!filters.priceMin && !filters.priceMax}
            onClick={() => onChange((f) => ({ ...f, priceMin: "", priceMax: "" }))}
          />
          {priceBrackets.map((bracket) => (
            <Pill
              key={`${bracket.min}-${bracket.max}`}
              label={bracketLabel(bracket)}
              selected={filters.priceMin === bracket.min && filters.priceMax === bracket.max}
              onClick={() =>
                onChange((f) => ({ ...f, priceMin: bracket.min, priceMax: bracket.max }))
              }
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <NumberInput
            placeholder={t("filters.priceFrom")}
            value={filters.priceMin}
            onChange={(value) => onChange((f) => ({ ...f, priceMin: value }))}
          />
          <NumberInput
            placeholder={t("filters.priceTo")}
            value={filters.priceMax}
            onChange={(value) => onChange((f) => ({ ...f, priceMax: value }))}
          />
        </div>
      </Group>

      {/* Rooms — a numeric keypad rather than seven word-chips -------------- */}
      <Group label={t("filters.allRooms")}>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={!filters.rooms}
            onClick={() => onChange((f) => ({ ...f, rooms: "" }))}
            className={cn(
              "h-9 border px-3 text-xs font-bold transition-colors",
              !filters.rooms
                ? "border-gold bg-gold-100 text-navy"
                : "border-cream-200 text-muted hover:border-gold/60 hover:text-navy",
            )}
          >
            {t("filters.any")}
          </button>
          {[1, 2, 3, 4, 5, 6].map((n) => {
            const on = filters.rooms === String(n);
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                aria-label={t("filters.roomsAtLeast", { count: n })}
                onClick={() => onChange((f) => ({ ...f, rooms: on ? "" : String(n) }))}
                className={cn(
                  "h-9 w-9 border text-xs font-bold tabular-nums transition-colors",
                  on
                    ? "border-gold bg-gold-100 text-navy"
                    : "border-cream-200 text-muted hover:border-gold/60 hover:text-navy",
                )}
              >
                {n}+
              </button>
            );
          })}
        </div>
      </Group>

      {/* Space -------------------------------------------------------------- */}
      <Group label={t("filters.sqmMin")}>
        <div className="grid grid-cols-3 gap-1.5">
          <Pill
            label={t("filters.any")}
            selected={!filters.sqm}
            onClick={() => onChange((f) => ({ ...f, sqm: "" }))}
          />
          {[100, 200, 400, 600, 1000].map((n) => (
            <Pill
              key={n}
              label={`${n}+`}
              selected={filters.sqm === String(n)}
              onClick={() =>
                onChange((f) => ({ ...f, sqm: f.sqm === String(n) ? "" : String(n) }))
              }
            />
          ))}
        </div>
      </Group>

      {/* Status + premium --------------------------------------------------- */}
      <Group label={t("filters.status")}>
        {STATUS_OPTIONS.map((status) => (
          <CheckRow
            key={status}
            label={t(`status.${status}`)}
            checked={filters.statuses.includes(status)}
            onChange={(checked) =>
              onChange((f) => ({
                ...f,
                statuses: checked
                  ? [...f.statuses, status]
                  : f.statuses.filter((s) => s !== status),
              }))
            }
          />
        ))}
        <CheckRow
          label={t("filters.premiumOnly")}
          checked={filters.premiumOnly}
          onChange={(checked) => onChange((f) => ({ ...f, premiumOnly: checked }))}
        />
        <CheckRow
          label={t("filters.chipFeatured")}
          checked={filters.featuredOnly}
          onChange={(checked) => onChange((f) => ({ ...f, featuredOnly: checked }))}
        />
      </Group>
    </div>
  );
}

/** One labelled band of the rail. The hairline above it is the only chrome. */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // The first group sits directly under the rail's own head rule, so it must
    // not draw a second one 20px below it.
    <fieldset className="mt-5 border-t border-cream-200 pt-4 first-of-type:mt-4 first-of-type:border-t-0 first-of-type:pt-0">
      <legend className="sr-only">{label}</legend>
      <p
        aria-hidden
        className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-navy"
      >
        {label}
      </p>
      {children}
    </fieldset>
  );
}

/** Single-select row: the name, and a tick when it is the one chosen. */
function ChoiceRow({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-2 py-1.5 text-start text-sm transition-colors",
        selected ? "font-bold text-navy" : "text-muted hover:text-navy",
      )}
    >
      <span className="truncate">{label}</span>
      {selected ? <CheckIcon width={14} height={14} strokeWidth={3} className="shrink-0 text-gold" /> : null}
    </button>
  );
}

/** Multi-select row. The box is drawn, not filled, until it is checked. */
function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2.5 py-1.5 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold",
          checked ? "border-gold bg-gold text-cream" : "border-cream-300 text-transparent",
        )}
      >
        <CheckIcon width={11} height={11} strokeWidth={3.5} />
      </span>
      <span className={cn("truncate", checked ? "font-bold text-navy" : "text-muted")}>
        {label}
      </span>
    </label>
  );
}

function Pill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "border px-2 py-2 text-[11px] font-bold tabular-nums transition-colors",
        selected
          ? "border-gold bg-gold-100 text-navy"
          : "border-cream-200 text-muted hover:border-gold/60 hover:text-navy",
      )}
    >
      {label}
    </button>
  );
}

function NumberInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-cream-200 bg-transparent px-2.5 py-2 text-sm tabular-nums text-navy outline-none transition-colors placeholder:text-muted focus:border-gold"
    />
  );
}
