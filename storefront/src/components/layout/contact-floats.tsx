"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Phone, Share2, X } from "lucide-react";

import type { SiteSettings } from "@/lib/api";
import { telLink, waLink } from "@/lib/format";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

/**
 * The three-button rail: share, call, WhatsApp — the lower half of the fixed
 * `.contact-rail`, with the chat launcher sitting above it.
 *
 * Share prefers the OS share sheet and falls back to the clipboard; when
 * neither is available — an insecure origin, or a browser that blocks both —
 * it says so rather than failing silently, which is the reference's own
 * behaviour ("you can copy the link from the address bar").
 */
export function ContactFloats({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("floats");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const phone = settings.phone?.trim();
  const whatsapp = settings.whatsapp?.trim();

  async function share() {
    const url = window.location.href;
    const title = document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // A cancelled share sheet is not a failure — fall through to copying.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast(t("linkCopied"));
    } catch {
      setToast(t("copyManually"));
    }
  }

  return (
    <>
      <div className="contact-floats">
        <button type="button" className="share-float" aria-label={t("share")} onClick={share}>
          <Share2 size={19} />
        </button>
        {phone ? (
          <a href={telLink(phone)} aria-label={t("call")}>
            <Phone size={19} />
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={waLink(whatsapp, t("whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("whatsapp")}
          >
            <WhatsAppIcon size={20} />
          </a>
        ) : null}
      </div>

      {toast ? (
        <div className="global-toast share-toast" role="status">
          <Check size={16} />
          {toast}
          <button type="button" aria-label={t("close")} onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      ) : null}
    </>
  );
}
