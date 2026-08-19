"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * The compare shortlist: up to three properties, kept in `localStorage`, no
 * account anywhere.
 *
 * Every card on every page carries a toggle, and the bar and the compare table
 * have to agree with all of them instantly. Rather than lift that into a
 * provider the whole tree pays for, each hook subscribes to one custom event
 * that the writer dispatches — `storage` alone would not do, because it does
 * not fire in the tab that wrote.
 */
export const COMPARE_KEY = "kwt25:compare";
export const COMPARE_LIMIT = 3;
const EVENT = "kwt25:compare-changed";

export interface CompareEntry {
  id: number;
  slug: string;
  title: string;
  image: string | null;
}

function read(): CompareEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is CompareEntry =>
        Boolean(item) && typeof (item as CompareEntry).slug === "string",
      )
      .slice(0, COMPARE_LIMIT);
  } catch {
    return [];
  }
}

function write(items: CompareEntry[]) {
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useCompare() {
  // Server and first client render must agree, so the list starts empty and
  // fills in on mount — otherwise the toggles hydrate mismatched.
  const [items, setItems] = useState<CompareEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((entry: CompareEntry) => {
    const current = read();
    const existing = current.findIndex((item) => item.slug === entry.slug);
    if (existing >= 0) {
      write(current.filter((_, index) => index !== existing));
      return "removed" as const;
    }
    if (current.length >= COMPARE_LIMIT) return "full" as const;
    write([...current, entry]);
    return "added" as const;
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((item) => item.slug !== slug));
  }, []);

  const clear = useCallback(() => write([]), []);

  return { items, ready, toggle, remove, clear };
}
