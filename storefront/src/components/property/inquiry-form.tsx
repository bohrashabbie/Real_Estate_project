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
      // Was emerald-on-emerald from Tailwind's stock palette — a third green
      // next to the brand accent, and the only place on the site that reached
      // outside the token set. Confirmation is the accent's job.
      <div className="border border-gold/40 bg-gold-100 p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center bg-gold text-cream">
          <CheckIcon width={22} height={22} strokeWidth={2.5} />
        </span>
        <p className="mt-3.5 font-display text-lg font-extrabold text-navy">{t("successTitle")}</p>
        <p className="mt-1.5 text-sm text-muted">{t("successBody")}</p>
      </div>
    );
  }

  const field =
    "w-full border border-cream-200 bg-transparent px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-gold";
  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-muted";

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5">
      <div className={cn("grid gap-3.5", wide ? "sm:grid-cols-2" : undefined)}>
        <label className="block">
          <span className={label}>{t("name")}</span>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{t("phone")}</span>
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
        <span className={label}>{t("message")}</span>
        <textarea
          required
          rows={wide ? 6 : 4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={cn(field, "resize-y")}
        />
      </label>

      {state === "error" ? (
        <p className="border border-state-closed/40 px-3.5 py-2.5 text-sm font-semibold text-state-closed">
          {t("error")}
        </p>
      ) : null}

      {/* The accent as a fill would put dark green under near-black type; the
          submit reads as basalt and turns accent on hover, like every other
          primary action in the system. */}
      <button
        type="submit"
        disabled={state === "submitting"}
        className="flex items-center justify-center gap-2.5 bg-navy px-6 py-3.5 text-sm font-bold text-cream transition-colors hover:bg-gold disabled:opacity-60"
      >
        {state === "submitting" ? t("sending") : t("send")}
        <SendIcon width={17} height={17} className="rtl:-scale-x-100" />
      </button>
    </form>
  );
}
