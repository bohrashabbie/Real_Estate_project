"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { SiteSettings } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ChatIcon,
  CheckIcon,
  CloseIcon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
  SendIcon,
  ShareIcon,
  WhatsappIcon,
} from "@/components/ui/icons";

/**
 * Copy `text` without the Clipboard API.
 *
 * `navigator.clipboard` is gated behind a secure context, and this site is
 * served over plain HTTP on the office's IP — so on the live site it is simply
 * `undefined`. The old textarea + `execCommand("copy")` trick still works
 * there, which is the whole reason it is kept around.
 */
function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  try {
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}

/** The old site's persistent conversion rail: share / call / WhatsApp circles
 *  on one side, gold "Talk to us" WhatsApp pill on the other. */
export function FloatingContact({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("floats");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const [pageUrl, setPageUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Read on open rather than at render: the rail is mounted in the layout, so
  // it outlives client-side navigations and would otherwise cache a stale URL.
  function currentPage() {
    return { url: window.location.href, title: document.title };
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [menuOpen]);

  async function share() {
    const { url, title } = currentPage();
    // Native sheet where it exists (phones on HTTPS). It needs a secure
    // context, so on this HTTP deployment we fall through to the menu.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled, or the sheet refused — fall through to the menu.
      }
    }
    setPageUrl(url);
    setPageTitle(title);
    setCopied("idle");
    setMenuOpen(true);
  }

  async function copyLink() {
    const { url } = currentPage();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(url);
    setCopied(ok ? "done" : "failed");
    setTimeout(() => setCopied("idle"), 2500);
  }

  const shareTargets = pageUrl
    ? [
        {
          key: "whatsapp",
          label: t("shareWhatsapp"),
          href: `https://wa.me/?text=${encodeURIComponent(`${pageTitle} ${pageUrl}`)}`,
          icon: <WhatsappIcon width={18} height={18} />,
          className: "text-whatsapp",
        },
        {
          key: "telegram",
          label: t("shareTelegram"),
          href: `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(pageTitle)}`,
          icon: <SendIcon width={18} height={18} />,
          className: "text-navy",
        },
        {
          key: "email",
          label: t("shareEmail"),
          href: `mailto:?subject=${encodeURIComponent(pageTitle)}&body=${encodeURIComponent(pageUrl)}`,
          icon: <MailIcon width={18} height={18} />,
          className: "text-gold-dark",
        },
      ]
    : [];

  return (
    <>
      {/* Side rail: inline-end = left in Arabic, right in English. */}
      <div className="fixed bottom-28 end-3 z-40 flex flex-col gap-3 sm:bottom-32">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={share}
            aria-label={t("share")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-cream shadow-float transition-transform hover:scale-105"
          >
            <ShareIcon width={20} height={20} />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              aria-label={t("shareVia")}
              className="absolute bottom-0 end-14 w-56 rounded-2xl bg-cream-50 p-2 shadow-float ring-1 ring-cream-200"
            >
              <div className="flex items-center justify-between gap-2 px-2.5 pb-1.5 pt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  {t("shareVia")}
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label={t("shareClose")}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-cream-100 hover:text-navy"
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </div>

              {shareTargets.map((target) => (
                <a
                  key={target.key}
                  role="menuitem"
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-bold text-navy transition-colors hover:bg-cream-100"
                >
                  <span className={target.className}>{target.icon}</span>
                  {target.label}
                </a>
              ))}

              <button
                type="button"
                role="menuitem"
                onClick={copyLink}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-bold text-navy transition-colors hover:bg-cream-100"
              >
                <span className={cn(copied === "done" ? "text-emerald-600" : "text-muted")}>
                  {copied === "done" ? (
                    <CheckIcon width={18} height={18} strokeWidth={2.4} />
                  ) : (
                    <LinkIcon width={18} height={18} />
                  )}
                </span>
                {copied === "done"
                  ? t("linkCopied")
                  : copied === "failed"
                    ? t("copyFailed")
                    : t("shareCopy")}
              </button>
            </div>
          ) : null}
        </div>
        {settings.phone ? (
          <a
            href={telLink(settings.phone)}
            aria-label={t("call")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-cream shadow-float transition-transform hover:scale-105"
          >
            <PhoneIcon width={20} height={20} />
          </a>
        ) : null}
        {settings.whatsapp ? (
          <a
            href={waLink(settings.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("whatsapp")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-cream shadow-float transition-transform hover:scale-105"
          >
            <WhatsappIcon width={22} height={22} />
          </a>
        ) : null}
      </div>

      {/* "Talk to us" pill on the opposite corner. */}
      {settings.whatsapp ? (
        <a
          href={waLink(settings.whatsapp, t("talkToUsMessage"))}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 start-4 z-40 inline-flex items-center gap-3 rounded-full bg-gold px-6 py-3.5 text-base font-bold text-navy shadow-float transition-colors hover:bg-gold-dark hover:text-cream"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-navy/50" />
          {t("talkToUs")}
          <ChatIcon width={22} height={22} />
        </a>
      ) : null}
    </>
  );
}
