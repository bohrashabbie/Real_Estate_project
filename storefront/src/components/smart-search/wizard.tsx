"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { apiPost, type Area, type PropertyType, type SmartSearchResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PropertyCard } from "@/components/property/property-card";
import { ArrowIcon, ResetIcon, SearchIcon, SparkleIcon } from "@/components/ui/icons";

/**
 * /smart-search — the "answer 5 quick questions" wizard:
 * purpose → type → area → budget → rooms, then POST /public/v1/smart-search.
 * The backend relaxes filters progressively; `relaxed` lists which ones.
 */

const STEPS = ["purpose", "type", "area", "budget", "rooms"] as const;
type Step = (typeof STEPS)[number];

interface Answers {
  purpose?: string;
  type?: string;
  area?: string;
  budget_max?: string;
  rooms?: string;
}

export function SmartSearchWizard({
  areas,
  types,
  locale,
}: {
  areas: Area[];
  types: PropertyType[];
  locale: Locale;
}) {
  const t = useTranslations();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [budgetInput, setBudgetInput] = useState("");
  const [phase, setPhase] = useState<"wizard" | "loading" | "results" | "error">("wizard");
  const [result, setResult] = useState<SmartSearchResult | null>(null);

  const step: Step = STEPS[stepIndex];

  function next(partial: Partial<Answers>) {
    const merged = { ...answers, ...partial };
    setAnswers(merged);
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      void submit(merged);
    }
  }

  async function submit(finalAnswers: Answers) {
    setPhase("loading");
    try {
      const payload: Record<string, unknown> = { locale };
      if (finalAnswers.purpose) payload.purpose = finalAnswers.purpose;
      if (finalAnswers.type) payload.type = finalAnswers.type;
      if (finalAnswers.area) payload.area = finalAnswers.area;
      if (finalAnswers.budget_max) payload.budget_max = Number(finalAnswers.budget_max);
      if (finalAnswers.rooms) payload.rooms = Number(finalAnswers.rooms);
      const response = await apiPost<SmartSearchResult>("/smart-search", payload);
      setResult(response);
      setPhase("results");
    } catch {
      setPhase("error");
    }
  }

  function reset() {
    setStepIndex(0);
    setAnswers({});
    setBudgetInput("");
    setResult(null);
    setPhase("wizard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-navy text-gold">
          <SparkleIcon width={26} height={26} />
        </span>
        <h1 className="mt-4 text-3xl font-bold text-navy sm:text-4xl">{t("smart.title")}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">{t("smart.subtitle")}</p>
      </header>

      {phase === "wizard" ? (
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-card ring-1 ring-cream-200 sm:p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2.5" aria-hidden>
            {STEPS.map((name, index) => (
              <span
                key={name}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  index === stepIndex
                    ? "w-8 bg-gold"
                    : index < stepIndex
                      ? "w-2.5 bg-gold/60"
                      : "w-2.5 bg-cream-200",
                )}
              />
            ))}
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-muted">
            {t("smart.stepOf", { current: stepIndex + 1, total: STEPS.length })}
          </p>

          <h2 className="mt-6 text-center text-2xl font-bold text-navy">
            {t(`smart.questions.${step}`)}
          </h2>

          <div className="mt-7">
            {step === "purpose" ? (
              <OptionGrid
                options={[
                  { value: "rent", label: t("purpose.rent") },
                  { value: "sale", label: t("purpose.sale") },
                ]}
                onSelect={(value) => next({ purpose: value })}
                anyLabel={t("smart.any")}
                onAny={() => next({ purpose: undefined })}
              />
            ) : null}

            {step === "type" ? (
              <OptionGrid
                options={types.map((pt) => ({ value: pt.key, label: pt.name }))}
                onSelect={(value) => next({ type: value })}
                anyLabel={t("smart.any")}
                onAny={() => next({ type: undefined })}
              />
            ) : null}

            {step === "area" ? (
              <OptionGrid
                options={areas.map((a) => ({ value: a.slug, label: a.name }))}
                onSelect={(value) => next({ area: value })}
                anyLabel={t("smart.anyArea")}
                onAny={() => next({ area: undefined })}
                scroll
              />
            ) : null}

            {step === "budget" ? (
              <div className="mx-auto flex max-w-sm flex-col gap-4">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(event) => setBudgetInput(event.target.value)}
                  placeholder={t("smart.budgetPlaceholder")}
                  className="rounded-2xl border border-cream-200 bg-white px-4 py-4 text-center text-lg font-bold text-navy outline-none transition-colors focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => next({ budget_max: budgetInput || undefined })}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gold px-6 py-4 text-base font-bold text-navy shadow-card transition-colors hover:bg-gold-dark hover:text-white"
                >
                  {t("smart.next")}
                  <ArrowIcon width={18} height={18} className="rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => next({ budget_max: undefined })}
                  className="text-sm font-semibold text-muted hover:text-navy"
                >
                  {t("smart.skipBudget")}
                </button>
              </div>
            ) : null}

            {step === "rooms" ? (
              <OptionGrid
                options={[1, 2, 3, 4, 5, 6].map((n) => ({
                  value: String(n),
                  label: t("smart.roomsOption", { count: n }),
                }))}
                onSelect={(value) => next({ rooms: value })}
                anyLabel={t("smart.any")}
                onAny={() => next({ rooms: undefined })}
              />
            ) : null}
          </div>

          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={() => setStepIndex(stepIndex - 1)}
              className="mx-auto mt-8 flex items-center gap-2 text-sm font-bold text-muted transition-colors hover:text-navy"
            >
              <ArrowIcon width={16} height={16} className="rotate-180 rtl:rotate-0" />
              {t("smart.back")}
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === "loading" ? (
        <section className="mt-8 rounded-3xl bg-white p-14 text-center shadow-card ring-1 ring-cream-200">
          <span className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-cream-100 text-gold">
            <SearchIcon width={26} height={26} />
          </span>
          <p className="mt-4 text-lg font-bold text-navy">{t("smart.searching")}</p>
        </section>
      ) : null}

      {phase === "error" ? (
        <section className="mt-8 rounded-3xl bg-white p-14 text-center shadow-card ring-1 ring-cream-200">
          <p className="text-lg font-bold text-navy">{t("smart.errorTitle")}</p>
          <p className="mt-2 text-muted">{t("smart.errorBody")}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-bold text-white hover:bg-navy-700"
          >
            {t("smart.restart")}
            <ResetIcon width={16} height={16} />
          </button>
        </section>
      ) : null}

      {phase === "results" && result ? (
        <section className="mt-8">
          {result.relaxed.length > 0 ? (
            <p className="rounded-2xl bg-gold-100 px-5 py-4 text-sm font-semibold text-navy ring-1 ring-gold/40">
              {t("smart.relaxedNote", {
                filters: result.relaxed
                  .map((key) => t.has(`smart.relaxedFilters.${key}`)
                    ? t(`smart.relaxedFilters.${key}`)
                    : key)
                  .join(locale === "ar" ? "، " : ", "),
              })}
            </p>
          ) : null}

          {result.items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-cream-300 bg-white/70 p-14 text-center">
              <p className="text-lg font-bold text-navy">{t("smart.noMatchTitle")}</p>
              <p className="mt-2 text-muted">{t("smart.noMatchBody")}</p>
              <Link
                href="/request"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-bold text-navy transition-colors hover:bg-gold-dark hover:text-white"
              >
                {t("smart.requestInstead")}
                <ArrowIcon width={16} height={16} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {result.items.map((property) => (
                <PropertyCard key={property.id} property={property} locale={locale} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-navy shadow-card ring-1 ring-cream-200 transition-colors hover:bg-cream-100"
            >
              {t("smart.restart")}
              <ResetIcon width={16} height={16} className="text-gold" />
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function OptionGrid({
  options,
  onSelect,
  anyLabel,
  onAny,
  scroll,
}: {
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  anyLabel: string;
  onAny: () => void;
  scroll?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-2 gap-2.5 sm:grid-cols-3",
          scroll ? "max-h-72 overflow-y-auto pe-1" : undefined,
        )}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="rounded-2xl border border-cream-200 bg-cream/60 px-4 py-3.5 text-sm font-bold text-navy transition-colors hover:border-gold hover:bg-gold-100"
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onAny}
        className="mx-auto mt-4 block text-sm font-semibold text-muted transition-colors hover:text-navy"
      >
        {anyLabel}
      </button>
    </div>
  );
}
