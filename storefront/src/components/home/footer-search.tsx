"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Building2,
  Check,
  House,
  KeyRound,
  LandPlot,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import type { Area, PropertyType } from "@/lib/api";
import type { Locale } from "@/i18n/routing";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";

const STEPS = 3;

/** Local copy of the wizard's map rather than an import from it: importing
 *  would pull the whole five-step module — results grid, PropertyCard,
 *  apiPost — into the home page's bundle for the sake of eight icons. */
const TYPE_ICONS: Record<string, typeof House> = {
  apartment: Building2,
  villa: House,
  land: LandPlot,
  office: Building2,
  commercial: Tag,
  floor: Bath,
  chalet: BedDouble,
  other: Search,
};

/**
 * The search-again block that closes the home page, above the WhatsApp band.
 *
 * It replaces what used to be a plain "tell us what you want and we'll call
 * you" banner. Someone who scrolls this far already looked through the
 * catalogue and didn't find it, so a second callback-request pitch repeats
 * the one live nav already offers (`footer.requestProperty`).
 *
 * Asked one question at a time, on request, in the shape of the Smart Search
 * wizard it hands off to — same progress line, same `.section-kicker`, same
 * `.option-card` grid, same Back/Next footer, drawn from the same rules in
 * globals.css rather than a second set that would drift from them. Three
 * questions here, not the wizard's five: purpose, type, area are exactly the
 * three the wizard can be seeded with, so answering them here means arriving
 * at results rather than at question one.
 *
 * Two earlier shapes are gone: two cards of captioned dropdown fields (the
 * page already opens with that exact filter, so the last thing on the page
 * looked like the first) and a fill-in-the-blank sentence. This one is the
 * one that matches where it leads.
 *
 * Submitting sends area/type/purpose to `/smart-search`, which (see that
 * wizard's `initial` prop) skips its own five questions and runs the match
 * immediately, landing the visitor on relevance-ranked results instead of a
 * plain filtered grid.
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

  const [step, setStep] = useState(1);
  const [area, setArea] = useState<string[]>([]);
  const [type, setType] = useState("");
  const [purpose, setPurpose] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Not the last step yet: Next advances instead of searching. Handled here
    // rather than by swapping the button's type, so Enter in the area field's
    // type-ahead does the same thing the visible button does.
    if (step < STEPS) {
      setStep(step + 1);
      return;
    }
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
          <span className="footer-search-kicker">
            <Sparkles size={14} />
            {t("footerSearch.kicker")}
          </span>
          <h2>{t("footerSearch.title")}</h2>
          <p>{t("footerSearch.body")}</p>
        </div>

        <form className="ask-wizard" onSubmit={submit}>
          <div className="wizard-page-top">
            <span>{t("smart.stepOf", { step, total: STEPS })}</span>
            <div className="progress">
              <i style={{ width: `${(step / STEPS) * 100}%` }} />
            </div>
          </div>

          <div className="wizard-page-question">
            <span className="section-kicker">{t("smart.stepKicker")}</span>

            {step === 1 ? (
              <>
                <h1>{t("smart.q1")}</h1>
                <div className="wizard-question-options">
                  {(["rent", "sale"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`option-card${purpose === value ? " is-selected" : ""}`}
                      onClick={() => setPurpose(purpose === value ? "" : value)}
                    >
                      <span>{value === "rent" ? <KeyRound size={16} /> : <Tag size={16} />}</span>
                      <strong>{t(`purpose.${value}`)}</strong>
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h1>{t("smart.q4")}</h1>
                <p>{t("smart.q4Hint")}</p>
                <div
                  className={`wizard-question-options option-grid options-${Math.min(types.length, 6)}`}
                >
                  {types.map((item) => {
                    const Icon = TYPE_ICONS[item.key] ?? House;
                    const selected = type === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className={`option-card${selected ? " is-selected" : ""}`}
                        onClick={() => setType(selected ? "" : item.key)}
                      >
                        <span>{selected ? <Check size={16} /> : <Icon size={16} />}</span>
                        <strong>{item.name}</strong>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h1>{t("smart.q2")}</h1>
                <p>{t("smart.q2Hint")}</p>
                <div className="wizard-question-options smart-area-picker">
                  <UnifiedAreaPicker
                    areas={areas}
                    value={area}
                    onChange={setArea}
                    locale={locale}
                    max={0}
                    idPrefix="footer-ask-areas"
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="wizard-page-actions">
            {/* ArrowRight is *back* and ArrowLeft is *forward* in this build:
                every arrow is drawn for Arabic, and globals.css mirrors the
                pair under `dir="ltr"`. Matches the standalone wizard, which
                had these the right way round while this card had them
                inverted -- "Back →" and "← Next" in English. */}
            <button
              className="button button-ghost"
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
            >
              <ArrowRight size={15} />
              {t("smart.previous")}
            </button>

            {step < STEPS ? (
              <button className="button button-gold" type="submit">
                <ArrowLeft size={15} />
                {t("smart.next")}
              </button>
            ) : (
              <button className="button button-gold" type="submit">
                <Search size={15} />
                {t("footerSearch.submit")}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
