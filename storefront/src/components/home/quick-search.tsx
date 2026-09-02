"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  Check,
  ChevronDown,
  House,
  KeyRound,
  MapPin,
  Repeat2,
  Search,
  Tag,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { formatCount } from "@/lib/format";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";

/**
 * The search bar that overlaps the hero: area, type, purpose, go.
 *
 * All three fields are `<details>` menus rather than `<select>`s. That is the
 * project's standing rule and it also earns its keep here — a native select
 * cannot hold the area type-ahead, and mixing one native control with two
 * custom ones in the same bar looks like a bug.
 */
export function Menu({
  label,
  icon,
  value,
  options,
  onPick,
  detailsName,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  /** Shared with the row's other fields so opening one closes any other
   *  that's already open — native `<details name>` exclusivity, not JS.
   *  Unsupported browsers just keep the old "more than one open" behaviour
   *  instead of erroring, so this costs nothing to pass unconditionally. */
  detailsName?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="home-search-field quick-filter-select">
      <span>
        {icon}
        <b>{label}</b>
      </span>
      <details ref={ref} name={detailsName}>
        <summary>
          {/* Gold chip once something other than "all" is picked, same
              treatment as the area field's chips — "this is selected"
              means the same gold pill everywhere in this search bar, not
              plain text for two fields and a chip for the third. */}
          <span className={value ? "area-chip" : undefined}>{current?.label}</span>
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

/**
 * The area picker: a `<details>` menu wrapping `UnifiedAreaPicker`, shared by
 * the top quick-search bar and the footer's search cards. `idPrefix` keeps
 * the two instances' generated element ids from colliding when both render
 * on the same page.
 *
 * Multi-select (`max={0}`, i.e. unlimited): a search filter narrows results
 * to whichever areas match, and "Salmiya or Jabriya" is a completely normal
 * thing to want to search for — there is no reason this has to be single-pick
 * the way, say, "which locale" is. Selected areas show as gold chips in the
 * closed summary, the same treatment as the featured/VIP badges elsewhere on
 * the site, rather than collapsing to a single name or a bare count — capped
 * at two plus a "+N" overflow chip so the field never grows past one line
 * inside the quick-search bar's grid row.
 */
export function AreaField({
  areas,
  area,
  onChange,
  locale,
  idPrefix,
  detailsName,
}: {
  areas: Area[];
  area: string[];
  onChange: (value: string[]) => void;
  locale: Locale;
  idPrefix: string;
  /** See `Menu`'s own doc on this prop — same shared-group mechanism. Area
   *  still doesn't close itself on a pick (it's multi-select; that's what
   *  the "done" button is for) but it does close when a sibling field
   *  opens, and opening it closes them. */
  detailsName?: string;
}) {
  const t = useTranslations();
  const details = useRef<HTMLDetailsElement>(null);
  const selectedAreas = area
    .map((slug) => areas.find((item) => item.slug === slug))
    .filter((item): item is Area => Boolean(item));
  const shown = selectedAreas.slice(0, 2);
  const overflow = selectedAreas.length - shown.length;

  return (
    <div className="home-search-field home-area-picker">
      <span>
        <MapPin size={14} />
        <b>{t("quickSearch.area")}</b>
      </span>
      <details ref={details} name={detailsName}>
        <summary>
          {selectedAreas.length === 0 ? (
            <span>{t("picker.allAreas")}</span>
          ) : (
            <span className="area-field-chips">
              {/* span, not b: `.home-search-field b` (this field's own
                  "Area" caption) sets color:navy at higher specificity than
                  a single class, which silently overrode this chip's white
                  text — invisible on the "+N" chip's navy background,
                  since that made it navy-on-navy. */}
              {shown.map((item) => (
                <span key={item.slug} className="area-chip">
                  {item.name}
                </span>
              ))}
              {overflow > 0 ? (
                <span className="area-chip area-chip-more">
                  {t("picker.moreAreas", { count: formatCount(overflow, locale) })}
                </span>
              ) : null}
            </span>
          )}
          <ChevronDown size={14} />
        </summary>
        <div className="home-area-menu">
          <UnifiedAreaPicker
            areas={areas}
            value={area}
            onChange={onChange}
            locale={locale}
            max={0}
            variant="inline"
            browser="expanded"
            idPrefix={idPrefix}
          />
          <footer>
            <small>{t("picker.helpMulti")}</small>
            <button type="button" onClick={() => details.current?.removeAttribute("open")}>
              {t("picker.done")}
            </button>
          </footer>
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
  initial?: { area?: string[]; type?: string; purpose?: string };
  variant?: "home" | "properties";
}) {
  const t = useTranslations();
  const router = useRouter();

  const [area, setArea] = useState<string[]>(initial?.area ?? []);
  const [type, setType] = useState(initial?.type ?? "");
  const [purpose, setPurpose] = useState(initial?.purpose ?? "");

  // Landing on /properties?purpose=rent must show "For rent" in the bar, and
  // the same must happen when a quick-link is followed from this very bar.
  // initial.area is a new array on every render (built fresh from
  // searchParams), so it can't sit in the dependency list itself without
  // re-running every time — its own values are what's compared instead.
  const initialAreaKey = initial?.area?.join(",") ?? "";
  useEffect(() => {
    setArea(initial?.area ?? []);
    setType(initial?.type ?? "");
    setPurpose(initial?.purpose ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAreaKey, initial?.type, initial?.purpose]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    // One area used to mean one `area=` param; picking several now means
    // several, in URL-param order, so a shared link round-trips every one
    // of them back through `all()` on the properties page rather than only
    // the first.
    for (const slug of area) params.append("area", slug);
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

          <AreaField
            areas={areas}
            area={area}
            onChange={setArea}
            locale={locale}
            idPrefix="quick-areas"
            detailsName="quick-search-fields"
          />

          <Menu
            label={t("quickSearch.type")}
            icon={<House size={14} />}
            value={type}
            onPick={setType}
            detailsName="quick-search-fields"
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
            detailsName="quick-search-fields"
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

        {/* Sale/rent first and last, every property type between them --
            this used to be a fixed, hand-picked three types (villas,
            apartments, land), which quietly hid the office's other six.
            One shared icon for every type link, the same call the actual
            "browse by property type" grid on the home page makes: the
            reader is scanning names, and a mismatched pictogram per type
            (a bed for "chalet", a magnifying glass for "other") reads as
            more different from its neighbours than it should. */}
        <nav className="home-quick-links" aria-label={t("quickSearch.shortcutsAria")}>
          <Link href="/properties?purpose=sale">
            <Tag size={14} />
            {t("quickSearch.shortcut.sale")}
          </Link>
          {types.map((type) => (
            <Link key={type.key} href={`/properties?type=${type.key}`}>
              <Building2 size={14} />
              {type.name}
            </Link>
          ))}
          <Link href="/properties?purpose=rent">
            <KeyRound size={14} />
            {t("quickSearch.shortcut.rent")}
          </Link>
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
