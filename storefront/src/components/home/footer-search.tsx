"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Check, Search, Sparkles } from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";

/**
 * One inline slot in the sentence: the picked word itself is the control.
 *
 * A `<details>` menu rather than a `<select>`, per the project rule, but
 * deliberately *not* the `Menu` component the two search bars share — that one
 * draws a captioned, bordered field, which is the shape this section is
 * explicitly meant not to repeat. Here the word sits in running text with a
 * gold underline and opens its options beneath itself.
 */
function Slot({
  value,
  options,
  onPick,
  name,
}: {
  value: string;
  options: { value: string; label: string }[];
  onPick: (value: string) => void;
  name: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <details className="smart-ask-slot" ref={ref} name={name}>
      <summary>
        <span>{current?.label}</span>
        <ChevronDown size={18} />
      </summary>
      <div className="smart-ask-menu">
        {options.map((option) => (
          <button
            key={option.value || "any"}
            type="button"
            className={option.value === value ? "is-selected" : undefined}
            onClick={() => {
              onPick(option.value);
              ref.current?.removeAttribute("open");
            }}
          >
            <span>{option.label}</span>
            {option.value === value ? <Check size={15} /> : null}
          </button>
        ))}
      </div>
    </details>
  );
}

/**
 * The search-again block that closes the home page, above the WhatsApp band.
 *
 * It replaces what used to be a plain "tell us what you want and we'll call
 * you" banner. Someone who scrolls this far already looked through the
 * catalogue and didn't find it, so a second callback-request pitch repeats
 * the one live nav already offers (`footer.requestProperty`).
 *
 * Written as a sentence to fill in — "Show me / to / in" with the choice
 * itself as the underlined word — rather than as a second row of captioned
 * dropdown fields. On request: the page already carries that exact filter at
 * the top (`QuickSearch`), and repeating its shape here made the last thing
 * on the page look like the first thing on it. The lead-in words are per
 * locale, so Arabic orders and inflects its own line ("أرني / من أجل / في")
 * instead of translating an English frame word for word.
 *
 * It hands off to Smart Search rather than to a `/properties` listing:
 * submitting sends area/type/purpose to `/smart-search`, which (see that
 * wizard's `initial` prop) skips its own five questions and runs the match
 * immediately, landing the visitor on relevance-ranked results instead of a
 * plain filtered grid. The link beside the button is the other door into the
 * same place, for someone who would rather answer the questions.
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
  const areaDetails = useRef<HTMLDetailsElement>(null);

  const [area, setArea] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState("");

  const selectedAreas = area
    .map((slug) => areas.find((item) => item.slug === slug))
    .filter((item): item is Area => Boolean(item));

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
          <span className="smart-ask-kicker">
            <Sparkles size={14} />
            {t("footerSearch.kicker")}
          </span>
          <h2>{t("footerSearch.title")}</h2>
          <p>{t("footerSearch.body")}</p>
        </div>

        <form className="smart-ask" onSubmit={submit}>
          <p className="smart-ask-line">
            <span className="smart-ask-lead">{t("footerSearch.leadType")}</span>
            <Slot
              name="footer-ask"
              value={type}
              onPick={setType}
              options={[
                { value: "", label: t("footerSearch.anyType") },
                ...types.map((item) => ({ value: item.key, label: item.name })),
              ]}
            />
          </p>

          <p className="smart-ask-line">
            <span className="smart-ask-lead">{t("footerSearch.leadPurpose")}</span>
            <Slot
              name="footer-ask"
              value={purpose}
              onPick={setPurpose}
              options={[
                { value: "", label: t("footerSearch.anyPurpose") },
                { value: "sale", label: t("footerSearch.buy") },
                { value: "rent", label: t("footerSearch.rent") },
              ]}
            />
          </p>

          <p className="smart-ask-line">
            <span className="smart-ask-lead">{t("footerSearch.leadArea")}</span>
            {/* The area slot is the one that cannot be a plain list: it is
                multi-select and type-ahead, so it wraps UnifiedAreaPicker
                the way every other area control on the site does. */}
            <details className="smart-ask-slot smart-ask-slot-area" ref={areaDetails} name="footer-ask">
              <summary>
                {selectedAreas.length === 0 ? (
                  <span>{t("footerSearch.anyArea")}</span>
                ) : (
                  <span className="smart-ask-areas">
                    {selectedAreas.slice(0, 2).map((item) => (
                      <span key={item.slug}>{item.name}</span>
                    ))}
                    {selectedAreas.length > 2 ? (
                      <span>
                        {t("picker.moreAreas", { count: String(selectedAreas.length - 2) })}
                      </span>
                    ) : null}
                  </span>
                )}
                <ChevronDown size={18} />
              </summary>
              <div className="smart-ask-menu smart-ask-area-menu">
                <UnifiedAreaPicker
                  areas={areas}
                  value={area}
                  onChange={setArea}
                  locale={locale}
                  max={0}
                  variant="inline"
                  browser="expanded"
                  idPrefix="footer-ask-areas"
                />
                <footer>
                  <small>{t("picker.helpMulti")}</small>
                  <button
                    type="button"
                    onClick={() => areaDetails.current?.removeAttribute("open")}
                  >
                    {t("picker.done")}
                  </button>
                </footer>
              </div>
            </details>
          </p>

          <div className="smart-ask-actions">
            <button className="button button-gold" type="submit">
              <Search size={15} />
              {t("footerSearch.submit")}
            </button>
            <Link className="smart-ask-alt" href="/smart-search">
              {t("footerSearch.wizard")}
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
}
