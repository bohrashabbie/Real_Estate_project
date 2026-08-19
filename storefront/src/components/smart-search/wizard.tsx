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
  Clock3,
  House,
  KeyRound,
  LandPlot,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiPost, type Area, type PropertyType, type SmartSearchResult } from "@/lib/api";
import { formatCount, waLink } from "@/lib/format";
import { UnifiedAreaPicker } from "@/components/ui/unified-area-picker";
import { PropertyCard } from "@/components/property/property-card";
import { BrandLockup } from "@/components/layout/brand-lockup";

const STEPS = 5;

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
 * Five questions, then results.
 *
 * The answers map one-to-one onto `/public/v1/smart-search`, which relaxes the
 * filters server-side rather than returning nothing: the API says which
 * constraints it had to drop, and the results header repeats that back, so a
 * loose match never looks like an exact one.
 *
 * Only purpose is required to advance. Every other question can be skipped —
 * someone who does not know their budget yet should still reach results, and a
 * wizard that refuses to move is a wizard people abandon.
 */
export function SmartSearchWizard({
  areas,
  types,
  locale,
  whatsapp,
  siteName,
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
  whatsapp: string | null;
  siteName: string;
}) {
  const t = useTranslations();
  const [step, setStep] = useState(1);
  // Rent is pre-selected, as the reference does: it is the commoner search, and
  // a first question with nothing chosen puts a disabled Next button in front
  // of someone who has only just arrived.
  const [purpose, setPurpose] = useState<"rent" | "sale" | null>("rent");
  const [area, setArea] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [type, setType] = useState<string[]>([]);
  const [rooms, setRooms] = useState<number | null>(null);

  const [result, setResult] = useState<SmartSearchResult | null>(null);
  const [state, setState] = useState<"idle" | "searching" | "error">("idle");

  async function run() {
    setState("searching");
    try {
      const payload = await apiPost<SmartSearchResult>(
        "/smart-search",
        {
          purpose,
          area: area[0] ?? null,
          type: type[0] ?? null,
          budget_max: budgetMax ? Number(budgetMax) : null,
          rooms,
        },
        { locale },
      );
      setResult(payload);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  function next() {
    if (step < STEPS) {
      setStep(step + 1);
      return;
    }
    void run();
  }

  /* ---------------------------------------------------------------- results */

  if (result) {
    const criteria = [
      purpose ? t(`purpose.${purpose}`) : null,
      area[0] ? (areas.find((item) => item.slug === area[0])?.name ?? null) : null,
      type[0] ? (types.find((item) => item.key === type[0])?.name ?? null) : null,
      budgetMax ? t("smart.budgetUpTo", { amount: budgetMax }) : null,
      rooms ? t("card.rooms", { count: rooms }) : null,
    ].filter(Boolean) as string[];

    return (
      <div className="smart-results">
        <div className="search-summary">
          <Search size={16} />
          {criteria.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        {result.relaxed.length > 0 ? (
          <p className="featured-only-note">
            <Sparkles size={15} />
            {t("smart.relaxed", { fields: result.relaxed.join("، ") })}
          </p>
        ) : null}

        {result.items.length === 0 ? (
          <div className="no-results">
            <Search size={36} />
            <h2>{t("smart.emptyTitle")}</h2>
            <p>{t("smart.emptyBody")}</p>
            <Link className="button button-dark" href="/request">
              {t("smart.emptyCta")}
            </Link>
          </div>
        ) : (
          <div className="property-grid two-column">
            {result.items.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                locale={locale}
                // The API returns its matches best-first; the badge turns that
                // ordering into something a visitor can read at a glance.
                matchScore={Math.max(70, 98 - index * 4)}
              />
            ))}
          </div>
        )}

        {whatsapp ? (
          <a
            className="smart-whatsapp"
            href={waLink(whatsapp, t("smart.whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle size={20} />
            <span>
              <strong>{t("smart.whatsappTitle")}</strong>
              <small>{t("smart.whatsappBody")}</small>
            </span>
            <ArrowLeft size={18} />
          </a>
        ) : null}

        <div className="wizard-page-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setResult(null);
              setStep(1);
            }}
          >
            <ArrowRight size={15} />
            {t("smart.startOver")}
          </button>
          <Link className="button button-gold" href="/properties">
            <ArrowLeft size={15} />
            {t("smart.browseAll")}
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- wizard */

  const canAdvance = step === 1 ? purpose !== null : true;

  return (
    <div className="smart-wizard-page">
      <aside>
        <BrandLockup name={siteName} tone="reversed" size="lg" />
        <div>
          <Sparkles size={22} />
          <h2>{t("smart.sidebarTitle")}</h2>
          <p>{t("smart.sidebarBody")}</p>
        </div>
        <span>
          <Clock3 size={14} />
          {t("smart.under30")}
        </span>
      </aside>

      <section>
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
                    onClick={() => setPurpose(value)}
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
              <h1>{t("smart.q2")}</h1>
              <p>{t("smart.q2Hint")}</p>
              <div className="wizard-question-options smart-area-picker">
                <UnifiedAreaPicker
                  areas={areas}
                  value={area}
                  onChange={setArea}
                  locale={locale}
                  max={1}
                  idPrefix="wizard-areas"
                />
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1>{t("smart.q3")}</h1>
              <div className="wizard-question-options budget-inputs">
                <label>
                  {t("smart.budgetFrom")}
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={budgetMin}
                    onChange={(event) => setBudgetMin(event.target.value)}
                  />
                  <span>{t("smart.kwd")}</span>
                </label>
                <label>
                  {t("smart.budgetTo")}
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={budgetMax}
                    onChange={(event) => setBudgetMax(event.target.value)}
                  />
                  <span>{t("smart.kwd")}</span>
                </label>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h1>{t("smart.q4")}</h1>
              <p>{t("smart.q4Hint")}</p>
              <div
                className={`wizard-question-options option-grid options-${Math.min(types.length, 6)}`}
              >
                {types.map((item) => {
                  const Icon = TYPE_ICONS[item.key] ?? House;
                  const selected = type[0] === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`option-card${selected ? " is-selected" : ""}`}
                      onClick={() => setType(selected ? [] : [item.key])}
                    >
                      <span>{selected ? <Check size={16} /> : <Icon size={16} />}</span>
                      <strong>{item.name}</strong>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h1>{t("smart.q5")}</h1>
              <div className="wizard-question-options rooms-grid">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`option-card${rooms === value ? " is-selected" : ""}`}
                    onClick={() => setRooms(rooms === value ? null : value)}
                  >
                    <span>
                      <BedDouble size={16} />
                    </span>
                    <strong>
                      {value === 5
                        ? t("smart.roomsPlus", { count: formatCount(value, locale) })
                        : t("card.rooms", { count: value })}
                    </strong>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {state === "error" ? <p className="form-error">{t("smart.error")}</p> : null}
        </div>

        <div className="wizard-page-actions">
          <button
            type="button"
            className="button button-ghost"
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
          >
            <ArrowRight size={15} />
            {t("smart.previous")}
          </button>
          <button
            type="button"
            className="button button-gold"
            onClick={next}
            disabled={!canAdvance || state === "searching"}
          >
            {step === STEPS ? <MapPin size={15} /> : <ArrowLeft size={15} />}
            {state === "searching"
              ? t("smart.searching")
              : step === STEPS
                ? t("smart.showResults")
                : t("smart.next")}
          </button>
        </div>
      </section>
    </div>
  );
}
