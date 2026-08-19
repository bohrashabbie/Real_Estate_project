"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

import { apiPost } from "@/lib/api";

/**
 * The three-field form in the detail page's contact card.
 *
 * The message is pre-filled with the listing's own title, because the office
 * reads these in a queue and "I want to know more" with no subject costs them
 * a phone call to work out which property it was about.
 *
 * `website` is a honeypot: styled off-screen by `.hp-field`, invisible to
 * people, irresistible to the bots that submit every field they can see.
 */
export function InquiryForm({
  propertyId,
  propertyTitle,
}: {
  propertyId: number;
  propertyTitle: string;
}) {
  const t = useTranslations("inquiry");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (String(form.get("website") ?? "").trim()) return;

    setState("sending");
    try {
      await apiPost("/inquiries", {
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
        property_id: propertyId,
        source: "property",
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return <p className="inline-success">{t("sent")}</p>;
  }

  return (
    <form className="mini-inquiry" onSubmit={submit}>
      <input className="hp-field" name="website" tabIndex={-1} autoComplete="off" aria-hidden />

      {state === "error" ? <p className="form-error">{t("error")}</p> : null}

      <label>
        {t("name")}
        <input name="name" required maxLength={120} autoComplete="name" />
      </label>
      <label>
        {t("phone")}
        <input name="phone" required maxLength={32} inputMode="tel" autoComplete="tel" />
      </label>
      <label>
        {t("message")}
        <textarea
          name="message"
          required
          maxLength={4000}
          defaultValue={t("prefill", { title: propertyTitle })}
        />
      </label>

      <button type="submit" className="button button-gold full-button" disabled={state === "sending"}>
        <Send size={15} />
        {state === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
