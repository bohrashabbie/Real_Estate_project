"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import { roomsFilterApplies } from "@/lib/property";
import { cn } from "@/lib/utils";
import { OptionPicker } from "@/components/ui/option-picker";
import {
  BuildingIcon,
  BedIcon,
  HomeIcon,
  PinIcon,
  SearchIcon,
  SwapIcon,
  TagIcon,
} from "@/components/ui/icons";

/**
 * The home search panel.
 *
 * Order follows the reference design: the panel names itself first, then the
 * fields in the order a visitor actually decides them — where, what kind, to
 * buy or to rent, how many rooms, how much — and the popular shortcuts come
 * *after* the panel, not inside it. Every option list is a two-column
 * `OptionPicker`, the same control the listing filters use.
 */
export function QuickSearch({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations();
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [area, setArea] = useState<string[]>([]);
  const [type, setType] = useState<string[]>([]);
  const [rooms, setRooms] = useState<string[]>([]);
  const [priceMax, setPriceMax] = useState("");

  // Land and floors have no rooms, so the control goes away rather than
  // offering a filter that can only return nothing. Any stale selection goes
  // with it, otherwise a hidden "3+ rooms" would silently narrow the results.
  const showRooms = roomsFilterApplies(type);

  function submit() {
    const params = new URLSearchParams();
    if (purpose) params.set("purpose", purpose);
    if (area[0]) params.set("area", area[0]);
    if (type.length) params.set("type", type.join(","));
    if (showRooms && rooms[0]) params.set("rooms", rooms[0]);
    if (priceMax) params.set("price_max", priceMax);
    const qs = params.toString();
    router.push(qs ? `/properties?${qs}` : "/properties");
  }

  const purposeTabs = [
    { value: "", label: t("home.everyone") },
    { value: "rent", label: t("purpose.rent") },
    { value: "sale", label: t("purpose.sale") },
  ];

  const chips = [
    { label: t("home.chips.forSale"), href: "/properties?purpose=sale", icon: <TagIcon width={15} height={15} /> },
    { label: t("home.chips.villas"), href: "/properties?type=villa", icon: <BuildingIcon width={15} height={15} /> },
    { label: t("home.chips.apartments"), href: "/properties?type=apartment", icon: <HomeIcon width={15} height={15} /> },
    { label: t("home.chips.forRent"), href: "/properties?purpose=rent", icon: <TagIcon width={15} height={15} /> },
  ];

  return (
    <>
      <div className="rounded-3xl bg-white p-5 shadow-float ring-1 ring-cream-200 sm:p-6">
        <p className="text-sm font-bold text-gold-dark">{t("home.quickSearch")}</p>
        <h2 className="mt-1 font-display text-[24px] font-normal leading-[1.45] text-navy sm:text-[30px]">
          {t("home.findIdeal")}
        </h2>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <OptionPicker
            icon={<PinIcon width={16} height={16} />}
            label={t("home.area")}
            placeholder={t("home.allAreas")}
            allHint={t("picker.areaCount", { count: areas.length })}
            options={areas.map((a) => ({ value: a.slug, label: a.name }))}
            value={area}
            onChange={setArea}
            searchable
          />

          <OptionPicker
            icon={<HomeIcon width={16} height={16} />}
            label={t("home.propertyType")}
            placeholder={t("home.allTypes")}
            options={types.map((pt) => ({ value: pt.key, label: pt.name }))}
            value={type}
            onChange={setType}
            multiple
          />

          <OptionPicker
            icon={<SwapIcon width={16} height={16} />}
            label={t("home.saleOrRent")}
            placeholder={t("home.everyone")}
            allLabel={t("home.everyone")}
            options={purposeTabs
              .filter((tab) => tab.value)
              .map((tab) => ({ value: tab.value, label: tab.label }))}
            value={purpose ? [purpose] : []}
            onChange={(next) => setPurpose(next[0] ?? "")}
          />

          {showRooms ? (
            <OptionPicker
              icon={<BedIcon width={16} height={16} />}
              label={t("home.rooms")}
              placeholder={t("home.anyRooms")}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({
                value: String(n),
                label: t("filters.roomsAtLeast", { count: n }),
              }))}
              value={rooms}
              onChange={setRooms}
            />
          ) : null}

          <label
            className={cn(
              "block rounded-2xl border border-cream-200 bg-cream-50 px-4 py-2.5 transition-colors focus-within:border-gold focus-within:bg-white",
              showRooms ? undefined : "lg:col-span-2",
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              <span className="text-gold">
                <TagIcon width={16} height={16} />
              </span>
              {t("home.maxPrice")}
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              placeholder={t("home.maxPricePlaceholder")}
              className="mt-0.5 w-full bg-transparent text-base font-bold text-navy outline-none placeholder:font-medium placeholder:text-navy/70"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={submit}
          className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-navy px-7 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-navy-700 active:scale-[0.99]"
        >
          <SearchIcon width={19} height={19} />
          {t("home.search")}
        </button>
      </div>

      {/* Popular shortcuts, below the panel rather than inside it. */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-200 bg-white px-5 py-2.5 text-sm font-bold text-navy shadow-card transition-colors hover:border-gold/60 hover:bg-gold-100"
          >
            <span className="text-gold">{chip.icon}</span>
            {chip.label}
          </Link>
        ))}
      </div>
    </>
  );
}
