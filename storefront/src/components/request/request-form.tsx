"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { apiPost, type Area, type PropertyType } from "@/lib/api";
import { roomsFilterApplies } from "@/lib/property";
import { ArrowIcon, CheckIcon, SendIcon } from "@/components/ui/icons";
import { OptionPicker } from "@/components/ui/option-picker";

/** "Request your property" → POST /public/v1/property-requests. Everything but
 *  name + phone is optional, matching the API contract. */
export function RequestForm({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations("request");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    purpose: "",
    typeId: "",
    areaId: "",
    budgetMin: "",
    budgetMax: "",
    rooms: "",
    notes: "",
  });
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // The form stores the type's id; roomlessness is keyed on `key`, so resolve
  // one to the other. Land and floors get no rooms field at all.
  const selectedTypeKey = types.find((type) => String(type.id) === form.typeId)?.key;
  const showRooms = roomsFilterApplies(selectedTypeKey ? [selectedTypeKey] : []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    try {
      await apiPost("/property-requests", {
        name: form.name,
        phone: form.phone,
        purpose: form.purpose || null,
        property_type_id: form.typeId ? Number(form.typeId) : null,
        area_id: form.areaId ? Number(form.areaId) : null,
        budget_min: form.budgetMin ? Number(form.budgetMin) : null,
        budget_max: form.budgetMax ? Number(form.budgetMax) : null,
        // A room count left over from before the visitor switched to land
        // would be sent for a property that cannot have one.
        rooms: showRooms && form.rooms ? Number(form.rooms) : null,
        notes: form.notes || null,
      });
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center ring-1 ring-emerald-200">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon width={26} height={26} />
        </span>
        <p className="mt-4 text-xl font-bold text-emerald-800">{t("successTitle")}</p>
        <p className="mt-2 text-emerald-700">{t("successBody")}</p>
        <Link
          href="/properties"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-navy-700"
        >
          {t("browseMeanwhile")}
          <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-2xl border border-cream-200 bg-white px-4 py-3 text-navy outline-none transition-colors focus:border-gold";
  const labelClass = "mb-1.5 block text-sm font-bold text-navy";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>{t("name")}</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{t("phone")}</span>
          <input
            type="tel"
            required
            dir="ltr"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {/* Choices go through the site's `OptionPicker` rather than a native
          `<select>`: a select is a single-column dropdown, and every other
          list of options on the site is a two-column grid. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionPicker
          label={t("purpose")}
          placeholder={t("noPreference")}
          options={[
            { value: "rent", label: t("purposeRent") },
            { value: "sale", label: t("purposeSale") },
          ]}
          value={form.purpose ? [form.purpose] : []}
          onChange={(next) => update("purpose", next[0] ?? "")}
        />
        <OptionPicker
          label={t("type")}
          placeholder={t("noPreference")}
          options={types.map((type) => ({ value: String(type.id), label: type.name }))}
          value={form.typeId ? [form.typeId] : []}
          onChange={(next) => update("typeId", next[0] ?? "")}
        />
      </div>

      <OptionPicker
        label={t("area")}
        placeholder={t("anyArea")}
        options={areas.map((area) => ({ value: String(area.id), label: area.name }))}
        value={form.areaId ? [form.areaId] : []}
        onChange={(next) => update("areaId", next[0] ?? "")}
        searchable
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className={labelClass}>{t("budgetMin")}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={form.budgetMin}
            onChange={(e) => update("budgetMin", e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>{t("budgetMax")}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={form.budgetMax}
            onChange={(e) => update("budgetMax", e.target.value)}
            className={inputClass}
          />
        </label>
        {/* No rooms field when the requested type has none — the same rule the
            search filters follow. */}
        {showRooms ? (
          <OptionPicker
            label={t("rooms")}
            placeholder={t("noPreference")}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}+` }))}
            value={form.rooms ? [form.rooms] : []}
            onChange={(next) => update("rooms", next[0] ?? "")}
          />
        ) : null}
      </div>

      <label className="block">
        <span className={labelClass}>{t("notes")}</span>
        <textarea
          rows={4}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder={t("notesPlaceholder")}
          className={`${inputClass} resize-y`}
        />
      </label>

      {state === "error" ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-100">
          {t("error")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex items-center justify-center gap-2.5 rounded-2xl bg-gold px-6 py-4 text-base font-bold text-navy shadow-card transition-colors hover:bg-gold-dark hover:text-white disabled:opacity-60"
      >
        {state === "submitting" ? t("sending") : t("send")}
        <SendIcon width={18} height={18} className="rtl:-scale-x-100" />
      </button>
    </form>
  );
}
