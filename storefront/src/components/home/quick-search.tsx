"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Check,
  ChevronDown,
  House,
  KeyRound,
  LandPlot,
  MapPin,
  Repeat2,
  Search,
  Tag,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { QUICK_LINKS } from "@/lib/nav";
import type { Area, PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";

const QUICK_ICONS = {
  tag: Tag,
  house: House,
  building: Building2,
  keyRound: KeyRound,
  landPlot: LandPlot,
} as const;

/**
 * The search bar that overlaps the hero: area, type, purpose, go.
 *
 * All three fields are `<details>` menus rather than `<select>`s. That is the
 * project's standing rule and it also earns its keep here — a native select
 * cannot hold the area type-ahead, and mixing one native control with two
 * custom ones in the same bar looks like a bug.
 */
function Menu({
  label,
  icon,
  value,
  options,
  onPick,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="home-search-field quick-filter-select">
      <span>
        {icon}
        <b>{label}</b>
      </span>
      <details ref={ref}>
        <summary>
          <span>{current?.label}</span>
          <ChevronDown size={14} />
        </summary>
        <div className="quick-filter-menu">
          {options.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              className={option.value === value ? "is-selected" : undefined}
              onClick={() => {
                onPick(option.value);
                ref.current?.removeAttribute("open");
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

export function QuickSearch({
  areas,
  types,
  locale,
  initial,
  variant = "home",
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
  initial?: { area?: string; type?: string; purpose?: string };
  variant?: "home" | "properties";
}) {
  const t = useTranslations();
  const router = useRouter();

  const [area, setArea] = useState<string[]>(initial?.area ? [initial.area] : []);
  const [type, setType] = useState(initial?.type ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");
  const areaDetails = useRef<HTMLDetailsElement>(null);

  // Landing on /properties?purpose=rent must show "For rent" in the bar, and
  // the same must happen when a quick-link is followed from this very bar.
  useEffect(() => {
    setArea(initial?.area ? [initial.area] : []);
    setType(initial?.type ?? "");
    setPurpose(initial?.purpose ?? "");
  }, [initial?.area, initial?.type, initial?.purpose]);

  const areaLabel =
    area.length === 0
      ? t("picker.allAreas")
      : (areas.find((item) => item.slug === area[0])?.name ?? t("picker.allAreas"));

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area[0]) params.set("area", area[0]);
    if (type) params.set("type", type);
    if (purpose) params.set("purpose", purpose);
    const query = params.toString();
    router.push(query ? `/properties?${query}` : "/properties");
  }

  return (
    <section
      className={`home-quick-search${variant === "properties" ? " properties-quick-search" : ""}`}
      aria-label={t("quickSearch.aria")}
    >
      <div className="container">
        <form onSubmit={submit}>
          <div className="home-search-title">
            <span>{t("quickSearch.kicker")}</span>
            <strong>{t("quickSearch.title")}</strong>
          </div>

          <div className="home-search-field home-area-picker">
            <span>
              <MapPin size={14} />
              <b>{t("quickSearch.area")}</b>
            </span>
            <details ref={areaDetails}>
              <summary>
                <span>{areaLabel}</span>
                <ChevronDown size={14} />
              </summary>
              <div className="home-area-menu">
                <UnifiedAreaPicker
                  areas={areas}
                  value={area}
                  onChange={setArea}
                  locale={locale}
                  max={1}
                  variant="inline"
                  browser="expanded"
                  idPrefix="quick-areas"
                />
                <footer>
                  <small>{t("picker.pickOne")}</small>
                  <button type="button" onClick={() => areaDetails.current?.removeAttribute("open")}>
                    {t("picker.done")}
                  </button>
                </footer>
              </div>
            </details>
          </div>

          <Menu
            label={t("quickSearch.type")}
            icon={<House size={14} />}
            value={type}
            onPick={setType}
            options={[
              { value: "", label: t("quickSearch.allTypes") },
              ...types.map((item) => ({ value: item.key, label: item.name })),
            ]}
          />

          <Menu
            label={t("quickSearch.purpose")}
            icon={<Repeat2 size={14} />}
            value={purpose}
            onPick={setPurpose}
            options={[
              { value: "", label: t("quickSearch.allPurposes") },
              { value: "sale", label: t("purpose.sale") },
              { value: "rent", label: t("purpose.rent") },
            ]}
          />

          <button className="button button-dark" type="submit">
            <Search size={15} />
            {t("quickSearch.submit")}
          </button>
        </form>

        <nav className="home-quick-links" aria-label={t("quickSearch.shortcutsAria")}>
          {QUICK_LINKS.map((link) => {
            const Icon = QUICK_ICONS[link.icon];
            return (
              <Link key={link.key} href={link.href}>
                <Icon size={14} />
                {t(`quickSearch.shortcut.${link.key}`)}
              </Link>
            );
          })}
        </nav>

        {/* The office's advert rail. It lives inside this section rather than
            in the page, because the reference measures its top margin from the
            shortcut row directly above it. */}
        <div className="home-announcement-banner" aria-label={t("announcement.aria")}>
          <span>{t("announcement.label")}</span>
          <div>
            <p>{t("announcement.body")}</p>
            <p aria-hidden>{t("announcement.body")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
