"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowIcon, ChevronDownIcon } from "@/components/ui/icons";

/**
 * The hero search — a line of writing, not a floating instrument panel.
 *
 * The old build put this in a bordered card that hovered over the banner's
 * lower edge, which is the single most recognisable property-portal component
 * there is. Here the fields sit directly on the page ground as underlined
 * slots, so the first screen reads as one continuous statement: headline,
 * then the sentence the visitor completes, then the way out.
 *
 * Everything is logical-direction (`ps`/`border-s`/`rtl:`), so the whole line
 * mirrors for Arabic without a second layout.
 */
export function SearchLine({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  const [rooms, setRooms] = useState("");

  function submit() {
    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (area) params.set("area", area);
    if (type) params.set("type", type);
    if (rooms) params.set("rooms", rooms);
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : "/properties");
  }

  const tabs = [
    { value: "", label: t("home.everyone") },
    { value: "rent", label: t("purpose.rent") },
    { value: "sale", label: t("purpose.sale") },
  ];

  const chips = [
    { label: t("home.chips.apartments"), href: "/properties?type=apartment" },
    { label: t("home.chips.villas"), href: "/properties?type=villa" },
    { label: t("home.chips.forSale"), href: "/properties?purpose=sale" },
    { label: t("home.chips.forRent"), href: "/properties?purpose=rent" },
  ];

  return (
    <div>
      {/* Purpose — text tabs marked by a rule, never a filled pill. */}
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setPurpose(tab.value)}
            aria-pressed={purpose === tab.value}
            className={cn(
              "border-b-2 pb-1.5 text-sm font-bold transition-colors",
              purpose === tab.value
                ? "border-gold text-navy"
                : "border-transparent text-muted hover:text-navy",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <UnderlineField label={t("home.area")}>
          <FieldSelect
            value={area}
            onChange={setArea}
            placeholder={t("home.allAreas")}
            options={areas.map((a) => ({ value: a.slug, label: a.name }))}
          />
        </UnderlineField>
        <UnderlineField label={t("home.propertyType")}>
          <FieldSelect
            value={type}
            onChange={setType}
            placeholder={t("home.allTypes")}
            options={types.map((pt) => ({ value: pt.key, label: pt.name }))}
          />
        </UnderlineField>
        <UnderlineField label={t("home.rooms")}>
          <FieldSelect
            value={rooms}
            onChange={setRooms}
            placeholder={t("home.anyRooms")}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: t("filters.roomsAtLeast", { count: n }),
            }))}
          />
        </UnderlineField>

        <div className="flex items-end">
          <button
            type="button"
            onClick={submit}
            className="group/go inline-flex w-full items-center justify-center gap-3 bg-navy px-8 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-gold sm:w-auto"
          >
            {t("home.search")}
            <ArrowIcon
              width={17}
              height={17}
              className="transition-transform group-hover/go:translate-x-1 rtl:rotate-180 rtl:group-hover/go:-translate-x-1"
            />
          </button>
        </div>
      </div>

      {/* Popular searches — plain underlined text, not another row of chips. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cream-200 pt-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          {t("home.popular")}
        </span>
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="border-b border-cream-300 pb-0.5 text-sm font-semibold text-navy transition-colors hover:border-gold hover:text-gold"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** A field is a label above a rule. The rule is the whole component. */
function UnderlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block border-b border-cream-300 pb-2 transition-colors focus-within:border-gold">
      <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function FieldSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <span className="flex items-center gap-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none bg-transparent font-display text-lg font-bold text-navy outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon width={16} height={16} className="shrink-0 text-gold" />
    </span>
  );
}
