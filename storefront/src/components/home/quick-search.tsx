"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  BuildingIcon,
  BedIcon,
  ChevronDownIcon,
  HomeIcon,
  PinIcon,
  SearchIcon,
  TagIcon,
} from "@/components/ui/icons";

/** The hero search panel: purpose tabs + area / type / rooms / max-price row
 *  that routes into /properties with URL params, plus quick chips underneath. */
export function QuickSearch({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [area, setArea] = useState("");
  const [type, setType] = useState("");
  const [rooms, setRooms] = useState("");
  const [priceMax, setPriceMax] = useState("");

  function submit() {
    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (area) params.set("area", area);
    if (type) params.set("type", type);
    if (rooms) params.set("rooms", rooms);
    if (priceMax) params.set("price_max", priceMax);
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : "/properties");
  }

  const tabs = [
    { value: "", label: t("home.everyone") },
    { value: "rent", label: t("purpose.rent") },
    { value: "sale", label: t("purpose.sale") },
  ];

  const chips = [
    { label: t("home.chips.apartments"), href: "/properties?type=apartment", icon: <HomeIcon width={15} height={15} /> },
    { label: t("home.chips.villas"), href: "/properties?type=villa", icon: <BuildingIcon width={15} height={15} /> },
    { label: t("home.chips.forSale"), href: "/properties?purpose=sale", icon: <TagIcon width={15} height={15} /> },
    { label: t("home.chips.forRent"), href: "/properties?purpose=rent", icon: <TagIcon width={15} height={15} /> },
  ];

  return (
    <div className="rounded-3xl bg-white/95 p-4 shadow-float ring-1 ring-cream-200 backdrop-blur sm:p-6">
      {/* Purpose segmented tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-cream p-1 ring-1 ring-cream-200">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setPurpose(tab.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-all sm:px-6",
                purpose === tab.value
                  ? "bg-navy text-white shadow-card"
                  : "text-muted hover:text-navy",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="hidden text-sm font-bold text-gold-dark sm:block">{t("home.quickSearch")}</p>
      </div>

      {/* Field row */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <Field icon={<PinIcon width={18} height={18} />} label={t("home.area")}>
          <FieldSelect value={area} onChange={setArea} placeholder={t("home.allAreas")}
            options={areas.map((a) => ({ value: a.slug, label: a.name }))} />
        </Field>
        <Field icon={<HomeIcon width={18} height={18} />} label={t("home.propertyType")}>
          <FieldSelect value={type} onChange={setType} placeholder={t("home.allTypes")}
            options={types.map((pt) => ({ value: pt.key, label: pt.name }))} />
        </Field>
        <Field icon={<BedIcon width={18} height={18} />} label={t("home.rooms")}>
          <FieldSelect value={rooms} onChange={setRooms} placeholder={t("home.anyRooms")}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({
              value: String(n),
              label: t("filters.roomsAtLeast", { count: n }),
            }))} />
        </Field>
        <Field icon={<TagIcon width={18} height={18} />} label={t("home.maxPrice")}>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            placeholder={t("home.maxPricePlaceholder")}
            className="w-full bg-transparent text-base font-semibold text-navy outline-none placeholder:font-medium placeholder:text-muted/60"
          />
        </Field>

        <button
          type="button"
          onClick={submit}
          className="bg-gold-gradient flex items-center justify-center gap-2.5 rounded-2xl px-7 py-4 text-base font-bold text-white shadow-gold transition-all hover:brightness-110 active:scale-[0.98] lg:self-stretch"
        >
          <SearchIcon width={19} height={19} />
          {t("home.search")}
        </button>
      </div>

      {/* Quick chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted/80">
          {t("home.popular")}
        </span>
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-cream/70 px-4 py-1.5 text-sm font-semibold text-navy transition-colors hover:border-gold/60 hover:bg-gold-100"
          >
            <span className="text-gold-dark">{chip.icon}</span>
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block rounded-2xl border border-cream-200 bg-cream-50 px-4 py-2.5 transition-colors focus-within:border-gold focus-within:bg-white">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        <span className="text-gold">{icon}</span>
        {label}
      </span>
      <span className="mt-0.5 block">{children}</span>
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
    <span className="flex items-center gap-1.5">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none bg-transparent text-base font-semibold text-navy outline-none"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon width={15} height={15} className="shrink-0 text-gold" />
    </span>
  );
}
