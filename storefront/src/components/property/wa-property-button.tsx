"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { waLink } from "@/lib/format";
import { WhatsappIcon } from "@/components/ui/icons";

/** Green WhatsApp CTA with a message prefilled with the property title and the
 *  page URL — the URL only exists in the browser, hence the client component. */
export function WaPropertyButton({ number, title }: { number: string; title: string }) {
  const t = useTranslations("detail");
  const [href, setHref] = useState(() => waLink(number, t("waMessage", { title })));

  useEffect(() => {
    setHref(waLink(number, `${t("waMessage", { title })}\n${window.location.href}`));
  }, [number, title, t]);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2.5 rounded-2xl bg-whatsapp px-6 py-4 text-base font-bold text-white shadow-card transition-colors hover:bg-whatsapp-dark"
    >
      {t("whatsapp")}
      <WhatsappIcon width={22} height={22} />
    </a>
  );
}
