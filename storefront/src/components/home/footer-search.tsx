"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { House, Repeat2, Search } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { AreaField, Menu } from "@/components/home/quick-search";

/**
 * The search-again block that closes the home page — its own band above the
 * footer, not overlapping it.
 *
 * It replaces what used to be a plain "tell us what you want and we'll call
 * you" banner. Someone who scrolls this far already looked through the
 * catalogue and didn't find it, so a second callback-request pitch repeats
 * the one live nav already offers (`footer.requestProperty`) — a live
 * search they can actually act on right here is the more useful thing to
 * put in this slot. It reuses the exact fields and submit behaviour of the
 * top bar (`AreaField`, `Menu`, the same `/properties?...` query) rather
 * than inventing a second search, split across two cards instead of one bar
 * to suit the narrower band it sits in.
 */
export function FooterSearch({
  areas,
  types,
  locale,
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
}) {
  const t = useTranslations();
  const router = useRouter();

  const [area, setArea] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (area[0]) params.set("area", area[0]);
    if (type) params.set("type", type);
    if (purpose) params.set("purpose", purpose);
    const query = params.toString();
    router.push(query ? `/properties?${query}` : "/properties");
  }

  return (
    <section className="footer-search">
      <div className="container">
        <div className="footer-search-intro">
          <h2>{t("footerSearch.title")}</h2>
          <p>{t("footerSearch.body")}</p>
        </div>

        <form className="footer-search-cards" onSubmit={submit}>
          <div className="footer-search-card">
            <AreaField
              areas={areas}
              area={area}
              onChange={setArea}
              locale={locale}
              idPrefix="footer-search-areas"
            />
            <Menu
              label={t("quickSearch.type")}
              icon={<House size={14} />}
              value={type}
              onPick={setType}
              options={[
                { value: "", label: t("quickSearch.allTypes") },
                ...types.map((item) => ({ value: item.key, label: item.name })),
              ]}
            />
          </div>

          <div className="footer-search-card footer-search-card-action">
            <Menu
              label={t("quickSearch.purpose")}
              icon={<Repeat2 size={14} />}
              value={purpose}
              onPick={setPurpose}
              options={[
                { value: "", label: t("quickSearch.allPurposes") },
                { value: "sale", label: t("purpose.sale") },
                { value: "rent", label: t("purpose.rent") },
              ]}
            />
            <button className="button button-gold full-button" type="submit">
              <Search size={15} />
              {t("quickSearch.submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
