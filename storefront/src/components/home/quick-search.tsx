"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import {
  BuildingIcon,
  ChevronDownIcon,
  HomeIcon,
  PinIcon,
  SearchIcon,
  SwapIcon,
  TagIcon,
} from "@/components/ui/icons";

/** The home "بحث سريع" card: area / type / purpose selects that route into
 *  /properties with URL params, plus the quick chips underneath. */
export function QuickSearch({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState("");

  function submit() {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (type) params.set("type", type);
    if (purpose) params.set("purpose", purpose);
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : "/properties");
  }

  const chips = [
    { label: t("home.chips.apartments"), href: "/properties?type=apartment", icon: <HomeIcon width={16} height={16} /> },
    { label: t("home.chips.villas"), href: "/properties?type=villa", icon: <BuildingIcon width={16} height={16} /> },
    { label: t("home.chips.forSale"), href: "/properties?purpose=sale", icon: <TagIcon width={16} height={16} /> },
    { label: t("home.chips.forRent"), href: "/properties?purpose=rent", icon: <TagIcon width={16} height={16} /> },
  ];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-cream-200 sm:p-7">
      <p className="text-sm font-bold text-gold">{t("home.quickSearch")}</p>
      <h2 className="mt-1 text-2xl font-bold text-navy">{t("home.findIdeal")}</h2>

      <div className="mt-5 flex flex-col gap-3">
        <SearchSelect
          icon={<PinIcon width={20} height={20} />}
          label={t("home.area")}
          value={area}
          onChange={setArea}
          placeholder={t("home.allAreas")}
          options={areas.map((a) => ({ value: a.slug, label: a.name }))}
        />
        <SearchSelect
          icon={<HomeIcon width={20} height={20} />}
          label={t("home.propertyType")}
          value={type}
          onChange={setType}
          placeholder={t("home.allTypes")}
          options={types.map((pt) => ({ value: pt.key, label: pt.name }))}
        />
        <SearchSelect
          icon={<SwapIcon width={20} height={20} />}
          label={t("home.saleOrRent")}
          value={purpose}
          onChange={setPurpose}
          placeholder={t("home.everyone")}
          options={[
            { value: "rent", label: t("purpose.rent") },
            { value: "sale", label: t("purpose.sale") },
          ]}
        />

        <button
          type="button"
          onClick={submit}
          className="mt-1 flex items-center justify-center gap-2.5 rounded-2xl bg-navy px-6 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700"
        >
          {t("home.search")}
          <SearchIcon width={19} height={19} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2.5">
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-cream px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-100"
          >
            {chip.label}
            <span className="text-gold-dark">{chip.icon}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchSelect({
  icon,
  label,
  value,
  onChange,
  placeholder,
  options,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="relative block rounded-2xl border border-cream-200 bg-white px-4 py-3 transition-colors focus-within:border-gold">
      <span className="flex items-center justify-between gap-2 text-sm font-bold text-navy">
        {label}
        <span className="text-gold">{icon}</span>
      </span>
      <span className="mt-1 flex items-center gap-2">
        <ChevronDownIcon width={16} height={16} className="shrink-0 text-muted" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent text-base font-medium text-navy outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
