import { API_BASE } from "@/lib/api";

type Messages = { [key: string]: string | Messages };

/** The {placeholder} names in a string -- "{count} properties" -> count. */
export function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

/**
 * The office's own wording (admin > Website Content), laid over the
 * defaults in messages/{locale}.json.
 *
 * A saved string is used only where a default still exists at that path and
 * it keeps exactly the default's {placeholders} -- so a renamed key or a
 * mistyped {count} falls back to the default instead of breaking the page.
 * Cached for 30 seconds: edits show up within half a minute, and a page view
 * doesn't cost a database read. If the API can't be reached, the defaults
 * stand.
 */
export async function withSiteTexts(defaults: Messages, locale: string): Promise<Messages> {
  let overrides: Record<string, string>;
  try {
    const response = await fetch(`${API_BASE}/site-texts?locale=${locale}`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) return defaults;
    overrides = (await response.json()) as Record<string, string>;
  } catch {
    return defaults;
  }

  const messages: Messages = structuredClone(defaults);
  for (const [path, value] of Object.entries(overrides)) {
    const parts = path.split(".");
    let node: Messages = messages;
    for (const part of parts.slice(0, -1)) {
      const next = node[part];
      if (typeof next !== "object") {
        node = {};
        break;
      }
      node = next;
    }
    const leaf = parts[parts.length - 1];
    const current = node[leaf];
    if (typeof current !== "string") continue;
    if (placeholders(current).join() !== placeholders(value).join()) continue;
    node[leaf] = value;
  }
  return messages;
}
