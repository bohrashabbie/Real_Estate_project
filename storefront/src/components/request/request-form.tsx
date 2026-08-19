"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { apiPost, type Area, type PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";

const MAX_AREAS = 5;

/**
 * "Ask for a property that isn't listed."
 *
 * The API models one area per request, which is the shape the office's queue
 * wants; the picker still takes up to five, and the extras are named in the
 * notes. That way a visitor who genuinely will take Salmiya *or* Jabriya does
 * not have to file two requests, and nothing is lost between the form and the
 * admin panel.
 */
export function RequestForm({
  areas,
  types,
  locale,
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
}) {
  const t = useTranslations("request");
  const tp = useTranslations("purpose");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") ?? "").trim()) return;

    const chosen = selectedAreas
      .map((slug) => areas.find((area) => area.slug === slug))
      .filter((area): area is Area => Boolean(area));

    const notes = String(form.get("notes") ?? "").trim();
    const extraAreas = chosen.slice(1);
    const size = String(form.get("size") ?? "").trim();

    const noteParts = [
      notes,
      extraAreas.length > 0
        ? t("alsoAreas", { areas: extraAreas.map((area) => area.name).join("، ") })
        : "",
      size ? t("approxSize", { size }) : "",
    ].filter(Boolean);

    setState("sending");
    try {
      await apiPost("/property-requests", {
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        purpose: String(form.get("purpose") ?? "") || null,
        property_type_id: form.get("type") ? Number(form.get("type")) : null,
        area_id: chosen[0]?.id ?? null,
        budget_min: form.get("budgetMin") ? Number(form.get("budgetMin")) : null,
        budget_max: form.get("budgetMax") ? Number(form.get("budgetMax")) : null,
        rooms: form.get("rooms") ? Number(form.get("rooms")) : null,
        notes: noteParts.join("\n") || null,
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="request-success">
        <h2>{t("successTitle")}</h2>
        <p>{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form className="full-request-form" onSubmit={submit}>
      <input className="hp-field" name="website" tabIndex={-1} autoComplete="off" aria-hidden />

      {state === "error" ? <p className="form-error">{t("error")}</p> : null}

      <div className="form-row">
        <label>
          {t("name")}
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          {t("phone")}
          <input
            name="phone"
            required
            maxLength={32}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+965 0000 0000"
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          {t("purpose")}
          <select name="purpose" defaultValue="rent">
            <option value="rent">{tp("rent")}</option>
            <option value="sale">{tp("sale")}</option>
          </select>
        </label>
        <label>
          {t("type")}
          <select name="type" defaultValue="">
            <option value="">{t("anyType")}</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="request-areas">
        <legend>{t("areasLegend")}</legend>
        <UnifiedAreaPicker
          areas={areas}
          value={selectedAreas}
          onChange={setSelectedAreas}
          locale={locale}
          max={MAX_AREAS}
          idPrefix="request-areas"
        />
      </fieldset>

      <div className="form-row">
        <label>
          {t("budgetFrom")}
          <input type="number" name="budgetMin" min={0} inputMode="numeric" />
        </label>
        <label>
          {t("budgetTo")}
          <input type="number" name="budgetMax" min={0} inputMode="numeric" />
        </label>
      </div>

      <div className="form-row">
        <label>
          {t("rooms")}
          <select name="rooms" defaultValue="">
            <option value="">{t("anyRooms")}</option>
            {[1, 2, 3, 4, 5, 6].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("size")}
          <input type="number" name="size" min={0} inputMode="numeric" />
        </label>
      </div>

      <label>
        {t("notes")}
        <textarea name="notes" maxLength={3000} placeholder={t("notesPlaceholder")} />
      </label>

      <label className="privacy-check">
        <input type="checkbox" name="privacy" required />
        <span>{t("privacy")}</span>
      </label>

      <button type="submit" className="button button-dark full-button" disabled={state === "sending"}>
        <Send size={15} />
        {state === "sending" ? t("sending") : t("submit")}
      </button>

      <p className="privacy-note">{t("privacyNote")}</p>
    </form>
  );
}
