"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, MapPin, Search, X } from "lucide-react";

import type { Area } from "@/lib/api";
import { formatCount } from "@/lib/format";
import type { Locale } from "@/i18n/routing";

export interface AreaPickerProps {
  areas: Area[];
  /** Selected area slugs. Empty means "everywhere". */
  value: string[];
  onChange: (slugs: string[]) => void;
  locale: Locale;
  /** `0` for the single-select pickers, `5` on the request form. */
  max?: number;
  /** Chips + help text, as on the request form; the quick search hides both. */
  variant?: "full" | "inline";
  /** `<details>` around the grid (request form) vs. always-open (quick search). */
  browser?: "collapsible" | "expanded";
  idPrefix?: string;
}

/**
 * One area picker for the whole site: a type-ahead over every Kuwait area, a
 * browsable grid of all of them, and — where more than one is allowed — the
 * chips for what has been picked.
 *
 * Search matches on a normalised string so "الجابرية" is found by typing
 * "جابرية" and by typing "jabriya": Arabic definite articles, diacritics and
 * the alef/yaa/taa-marbuta variants all collapse, and the English name is
 * searched alongside. Someone typing on a Latin keyboard should not have to
 * switch layouts to filter a list.
 */

const AR_DIACRITICS = /[ً-ْٰـ]/g;

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(AR_DIACRITICS, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/^ال/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function UnifiedAreaPicker({
  areas,
  value,
  onChange,
  locale,
  max = 0,
  variant = "full",
  browser = "collapsible",
  idPrefix = "areas",
}: AreaPickerProps) {
  const t = useTranslations("picker");
  const reactId = useId();
  const prefix = `${idPrefix}-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [query, setQuery] = useState("");

  const searchable = useMemo(
    () => areas.map((area) => ({ area, haystack: `${normalise(area.name)} ${normalise(area.slug)}` })),
    [areas],
  );

  const suggestions = useMemo(() => {
    const needle = normalise(query);
    if (!needle) return [];
    return searchable
      .filter((entry) => entry.haystack.includes(needle))
      .slice(0, 12)
      .map((entry) => entry.area);
  }, [query, searchable]);

  const selected = new Set(value);
  const atLimit = max > 0 && value.length >= max;

  function toggle(slug: string) {
    if (selected.has(slug)) {
      onChange(value.filter((item) => item !== slug));
      return;
    }
    if (max === 1) {
      onChange([slug]);
      return;
    }
    if (atLimit) return;
    onChange([...value, slug]);
  }

  const grid = (
    <div className="unified-area-options" id={`${prefix}-options`} role="listbox" aria-multiselectable={max !== 1}>
      <button
        type="button"
        className={`unified-area-option${value.length === 0 ? " is-selected" : ""}`}
        onClick={() => onChange([])}
        role="option"
        aria-selected={value.length === 0}
      >
        <MapPin />
        <span>{t("allAreas")}</span>
        <i>{value.length === 0 ? <Check /> : null}</i>
      </button>

      {areas.map((area) => {
        const isSelected = selected.has(area.slug);
        return (
          <button
            key={area.slug}
            type="button"
            className={`unified-area-option${isSelected ? " is-selected" : ""}`}
            onClick={() => toggle(area.slug)}
            disabled={!isSelected && atLimit}
            role="option"
            aria-selected={isSelected}
          >
            <MapPin />
            <span>{area.name}</span>
            <i>{isSelected ? <Check /> : null}</i>
          </button>
        );
      })}

      {areas.length === 0 ? <p className="unified-area-empty">{t("noAreas")}</p> : null}
    </div>
  );

  const title = (
    <div className="unified-area-browser-title">
      <span>
        <MapPin />
        {t("browseAll")}
      </span>
      <small>{t("areaCount", { count: formatCount(areas.length, locale) })}</small>
    </div>
  );

  return (
    <div className="unified-area-picker">
      <div className="unified-area-autocomplete">
        <label className="unified-area-search" htmlFor={`${prefix}-search`}>
          <Search />
          <input
            id={`${prefix}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAria")}
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls={`${prefix}-options`}
            autoComplete="off"
          />
          {/* The field is a three-column grid; with no query the trailing column
              simply stays empty rather than holding a placeholder element,
              which would draw the clear button's circle with nothing in it. */}
          {query ? (
            <button type="button" aria-label={t("clearSearch")} onClick={() => setQuery("")}>
              <X />
            </button>
          ) : null}
        </label>

        {query ? (
          <div className="unified-area-suggestions">
            {suggestions.length === 0 ? (
              <p>{t("noMatches")}</p>
            ) : (
              suggestions.map((area) => (
                <button
                  key={area.slug}
                  type="button"
                  className={selected.has(area.slug) ? "is-active" : undefined}
                  onClick={() => {
                    toggle(area.slug);
                    setQuery("");
                  }}
                >
                  <MapPin />
                  <span>
                    <strong>{area.name}</strong>
                    <small>{t("areaHint")}</small>
                  </span>
                  {selected.has(area.slug) ? <Check size={16} /> : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {variant === "full" && max !== 1 && value.length > 0 ? (
        <div className="unified-area-selected">
          {value.map((slug) => {
            const area = areas.find((item) => item.slug === slug);
            if (!area) return null;
            return (
              <button key={slug} type="button" onClick={() => toggle(slug)}>
                <span>{area.name}</span>
                <X />
              </button>
            );
          })}
        </div>
      ) : null}

      {browser === "collapsible" ? (
        <details className="unified-area-browser">
          <summary>
            <span>
              <MapPin />
              {t("browseAll")}
            </span>
            <small>{t("areaCount", { count: formatCount(areas.length, locale) })}</small>
          </summary>
          {grid}
        </details>
      ) : (
        <div className="unified-area-expanded">
          {title}
          {grid}
        </div>
      )}

      {variant === "full" ? (
        <small className="unified-area-help">
          {max > 1 ? t("helpMax", { max: formatCount(max, locale) }) : t("helpMulti")}
        </small>
      ) : null}
    </div>
  );
}
