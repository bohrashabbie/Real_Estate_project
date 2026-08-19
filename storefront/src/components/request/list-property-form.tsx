"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { apiPost, type Area, type PropertyType } from "@/lib/api";

/**
 * "List your property with us" — an owner offering the office stock.
 *
 * It files an inquiry rather than a property request: a property request is the
 * office looking *for* something on a visitor's behalf, and these are the exact
 * opposite. Filing it correctly is what keeps the admin's two queues meaning
 * what they say.
 */
export function ListPropertyForm({ areas, types }: { areas: Area[]; types: PropertyType[] }) {
  const t = useTranslations("listProperty");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") ?? "").trim()) return;

    const purpose = String(form.get("purpose") ?? "");
    const type = String(form.get("type") ?? "");
    const area = String(form.get("area") ?? "");
    const details = String(form.get("details") ?? "").trim();

    // The office reads these as free text, so the structured answers are folded
    // into the message rather than dropped for lack of a column.
    const message = [
      t("summary", {
        purpose: purpose === "sale" ? t("forSale") : t("forRent"),
        type: type || t("unspecified"),
        area: area || t("unspecified"),
      }),
      details,
    ]
      .filter(Boolean)
      .join("\n\n");

    setState("sending");
    try {
      await apiPost("/inquiries", {
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message,
        source: "home",
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="listing-success">
        <h2>{t("successTitle")}</h2>
        <p>{t("successBody")}</p>
      </div>
    );
  }

  return (
    <form className="full-request-form list-property-form" onSubmit={submit}>
      <input className="hp-field" name="website" tabIndex={-1} autoComplete="off" aria-hidden />

      <div className="list-property-form-heading">
        <span>{t("formKicker")}</span>
        <h2>{t("formTitle")}</h2>
        <p>{t("formBody")}</p>
      </div>

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
            placeholder={t("phonePlaceholder")}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          {t("purpose")}
          <select name="purpose" defaultValue="sale">
            <option value="sale">{t("forSale")}</option>
            <option value="rent">{t("forRent")}</option>
          </select>
        </label>
        <label>
          {t("type")}
          <select name="type" defaultValue="">
            <option value="">{t("chooseType")}</option>
            {types.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        {t("area")}
        <select name="area" defaultValue="">
          <option value="">{t("chooseArea")}</option>
          {areas.map((area) => (
            <option key={area.id} value={area.name}>
              {area.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t("details")}
        <textarea name="details" maxLength={3000} placeholder={t("detailsPlaceholder")} required />
      </label>

      <label className="privacy-check">
        <input type="checkbox" name="privacy" required />
        <span>{t("privacy")}</span>
      </label>

      <button type="submit" className="button button-gold full-button" disabled={state === "sending"}>
        <Send size={15} />
        {state === "sending" ? t("sending") : t("submit")}
      </button>

      <p className="privacy-note">{t("privacyNote")}</p>
    </form>
  );
}
