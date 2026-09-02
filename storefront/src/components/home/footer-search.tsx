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
 * the one live nav already offers (`footer.requestProperty`).
 *
 * It hands off to Smart Search rather than to a `/properties` listing:
 * submitting sends area/type/purpose to `/smart-search`, which (see that
 * wizard's `initial` prop) skips its own five questions and runs the match
 * immediately, landing the visitor on relevance-ranked results instead of a
 * plain filtered grid. The fields themselves (`AreaField`, `Menu`) are
 * still the top bar's, split across two cards to suit the narrower band
 * this section sits in.
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
    // Every selected area, not just the first -- smart-search now matches
    // on any of them (see SmartSearchIn.area), the same as the /properties
    // listing filter.
    for (const slug of area) params.append("area", slug);
    if (type) params.set("type", type);
    if (purpose) params.set("purpose", purpose);
    const query = params.toString();
    router.push(query ? `/smart-search?${query}` : "/smart-search");
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
              detailsName="footer-search-fields"
            />
            <Menu
              label={t("quickSearch.type")}
              icon={<House size={14} />}
              value={type}
              onPick={setType}
              detailsName="footer-search-fields"
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
              detailsName="footer-search-fields"
              options={[
                { value: "", label: t("quickSearch.allPurposes") },
                { value: "sale", label: t("purpose.sale") },
                { value: "rent", label: t("purpose.rent") },
              ]}
            />
            <button className="button button-gold full-button" type="submit">
              <Search size={15} />
              {t("footerSearch.submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
