"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckIcon, SendIcon } from "@/components/ui/icons";

/** Inquiry form → POST /public/v1/inquiries. Used on the property detail page
 *  (source="property", prefilled message) and the contact page (source="contact"). */
export function InquiryForm({
  propertyId,
  source,
  initialMessage = "",
  wide = false,
}: {
  propertyId?: number;
  source: "property" | "contact" | "home";
  initialMessage?: string;
  /** Lay name and phone side by side and stretch the submit button across the
   *  full width. For the contact page, where the card is much wider than the
   *  narrow column the property detail page gives this form. */
  wide?: boolean;
}) {
  const t = useTranslations("inquiry");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    try {
      await apiPost("/inquiries", {
        name,
        phone,
        message,
        property_id: propertyId ?? null,
        source,
      });
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-2xl bg-emerald-50 p-6 text-center ring-1 ring-emerald-200">
        <span className="mx-auto flex h-12 w-12 items-center justify-center bg-emerald-500 text-cream">
          <CheckIcon width={24} height={24} />
        </span>
        <p className="mt-3 text-lg font-bold text-emerald-800">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-emerald-700">{t("successBody")}</p>
      </div>
    );
  }

  const field =
    "w-full rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3 text-navy outline-none transition-colors focus:border-gold";

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className={cn("grid gap-4", wide ? "sm:grid-cols-2" : undefined)}>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-navy">{t("name")}</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-navy">{t("phone")}</span>
          <input
            type="tel"
            required
            dir="ltr"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={field}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-navy">{t("message")}</span>
        <textarea
          required
          rows={wide ? 6 : 4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={cn(field, "resize-y")}
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
        className="flex items-center justify-center gap-2.5 rounded-2xl bg-gold px-6 py-4 text-base font-bold text-navy shadow-card transition-colors hover:bg-gold-dark hover:text-cream disabled:opacity-60"
      >
        {state === "submitting" ? t("sending") : t("send")}
        <SendIcon width={18} height={18} className="rtl:-scale-x-100" />
      </button>
    </form>
  );
}
