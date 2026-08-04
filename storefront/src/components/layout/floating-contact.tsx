"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { SiteSettings } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { ChatIcon, PhoneIcon, ShareIcon, WhatsappIcon } from "@/components/ui/icons";

/** The old site's persistent conversion rail: share / call / WhatsApp circles
 *  on one side, gold "Talk to us" WhatsApp pill on the other. */
export function FloatingContact({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("floats");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    const title = document.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled — nothing to do.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently give up rather than crash the rail.
    }
  }

  return (
    <>
      {/* Side rail: inline-end = left in Arabic, right in English. */}
      <div className="fixed bottom-28 end-3 z-40 flex flex-col gap-3 sm:bottom-32">
        <button
          type="button"
          onClick={share}
          aria-label={t("share")}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gold text-white shadow-float transition-transform hover:scale-105"
        >
          <ShareIcon width={20} height={20} />
          {copied ? (
            <span className="absolute bottom-full mb-2 whitespace-nowrap rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white shadow-float">
              {t("linkCopied")}
            </span>
          ) : null}
        </button>
        {settings.phone ? (
          <a
            href={telLink(settings.phone)}
            aria-label={t("call")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white shadow-float transition-transform hover:scale-105"
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
            className="flex h-12 w-12 items-center justify-center rounded-full bg-whatsapp text-white shadow-float transition-transform hover:scale-105"
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
          className="fixed bottom-5 start-4 z-40 inline-flex items-center gap-3 rounded-full bg-gold px-6 py-3.5 text-base font-bold text-navy shadow-float transition-colors hover:bg-gold-dark hover:text-white"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-navy/50" />
          {t("talkToUs")}
          <ChatIcon width={22} height={22} />
        </a>
      ) : null}
    </>
  );
}
