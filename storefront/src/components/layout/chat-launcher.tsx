"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Send, X } from "lucide-react";

import { apiPost, type SiteSettings } from "@/lib/api";
import { formatPhone, waLink } from "@/lib/format";

/**
 * The "talk to us" button and its panel.
 *
 * The button is the top of the fixed `.contact-rail`, icon only like the three
 * under it — `aria-label` still names it, so dropping the visible word costs
 * screen readers nothing.
 *
 * There is no live-chat backend behind this and the panel does not pretend
 * otherwise: it opens in the reference's offline state — the amber note, the
 * WhatsApp escape hatch, and a three-field form. Submitting files a real
 * inquiry through `/public/v1/inquiries`, so the message lands in the same
 * admin queue as every other one rather than into a socket nobody is holding.
 */
export function ChatLauncher({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const whatsapp = settings.whatsapp?.trim();
  const officeName = settings.name_ar || "kwt25";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Bots fill every field they find; a human never sees this one.
    if ((form.get("website") as string)?.trim()) return;

    setState("sending");
    try {
      await apiPost("/inquiries", {
        name: String(form.get("name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        message: String(form.get("message") ?? "").trim(),
        source: "contact",
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        className="chat-launcher"
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle size={21} />
        <i />
      </button>

      {open ? (
        <aside className="chat-panel" aria-label={t("panelAria")}>
          <header>
            <div>
              <strong>{t("team", { office: officeName })}</strong>
              <span>{t("offline")}</span>
            </div>
            <button type="button" aria-label={t("close")} onClick={() => setOpen(false)}>
              <X size={15} />
            </button>
          </header>

          <p className="offline-note">
            {t("offlineNote")}{" "}
            {whatsapp ? (
              <a href={waLink(whatsapp, t("whatsappMessage"))} target="_blank" rel="noopener noreferrer">
                {t("offlineWhatsapp", { phone: formatPhone(whatsapp) })}
              </a>
            ) : null}
          </p>

          {state === "sent" ? (
            <div className="chat-messages">
              <p>{t("sent")}</p>
            </div>
          ) : (
            <form className="chat-start" onSubmit={submit}>
              <input className="hp-field" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
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
                <textarea name="message" required maxLength={4000} />
              </label>
              {state === "error" ? <p className="form-error">{t("error")}</p> : null}
              <button
                type="submit"
                className="button button-gold full-button"
                disabled={state === "sending"}
              >
                <Send size={15} />
                {state === "sending" ? t("sending") : t("start")}
              </button>
            </form>
          )}
        </aside>
      ) : null}
    </>
  );
}
