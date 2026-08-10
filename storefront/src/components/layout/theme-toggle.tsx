"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "kwt25-theme";

/** Runs before first paint, inlined into <head>. A returning visitor who chose
 *  dark must never see a flash of plaster first, and the only way to guarantee
 *  that is to stamp the attribute before the browser paints anything.
 *
 *  "System" resolves to a concrete light/dark value here rather than being left
 *  as an absent attribute — light is the product default, so an unset visitor
 *  gets light regardless of their OS, and only someone who explicitly picks
 *  System hands the choice back to their device. */
export const themeInitScript = `
(function(){
  try {
    var c = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "light";
    var t = c === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : c;
    document.documentElement.setAttribute("data-theme", t);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

function resolve(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Appearance switch, sitting beside the language toggle in the header —
 * language and appearance are the same kind of choice, so they read as a pair.
 *
 * Three states rather than two: a visitor who set their phone to dark has
 * expressed a preference, and a site with no way to honour it is being rude.
 * Light remains the default for anyone who has not chosen.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("theme");
  const [choice, setChoice] = useState<ThemeChoice>("light");
  // The server cannot know the stored choice, so the control renders its
  // default until mounted. Without this the markup mismatches on hydration.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Private browsing with storage denied — the default is still correct.
    }
    if (stored === "light" || stored === "dark" || stored === "system") setChoice(stored);
    setReady(true);
  }, []);

  // Only a visitor on "System" wants the page to follow the OS while open.
  useEffect(() => {
    if (choice !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      document.documentElement.setAttribute("data-theme", query.matches ? "dark" : "light");
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [choice]);

  function pick(next: ThemeChoice) {
    setChoice(next);
    document.documentElement.setAttribute("data-theme", resolve(next));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not fatal — the choice simply won't survive the session.
    }
  }

  const options: { value: ThemeChoice; label: string }[] = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ];

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn("inline-flex border border-cream-200", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => pick(option.value)}
          aria-pressed={ready ? choice === option.value : undefined}
          className={cn(
            "px-2.5 py-1 text-[11px] font-semibold tracking-wider transition-colors",
            "border-s border-cream-200 first:border-s-0",
            ready && choice === option.value
              ? "bg-gold text-cream"
              : "text-muted hover:text-navy",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
