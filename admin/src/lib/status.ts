/**
 * Mirrors of the backend's status vocabularies (SPEC.md enums). If the
 * backend's enums change, these must change with them.
 */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info"

/* -------------------------------------------------------------------------- */
/* Vocabularies                                                                */
/* -------------------------------------------------------------------------- */

export const PROPERTY_PURPOSE_VALUES = ["rent", "sale"] as const
export const PROPERTY_STATUS_VALUES = [
  "available",
  "rented",
  "sold",
  "reserved",
] as const
export const INQUIRY_STATUS_VALUES = ["new", "contacted", "closed"] as const
export const INQUIRY_SOURCE_VALUES = ["property", "contact", "home"] as const
export const REQUEST_STATUS_VALUES = [
  "new",
  "in_progress",
  "matched",
  "closed",
] as const

/* -------------------------------------------------------------------------- */
/* Badge tones                                                                 */
/* -------------------------------------------------------------------------- */

/** SPEC theme: Available=green, Rented/Sold=red/neutral, Reserved=amber. */
const TONE_BY_STATUS: Record<string, BadgeTone> = {
  // properties
  available: "success",
  rented: "danger",
  sold: "neutral",
  reserved: "warning",
  // publish state
  published: "success",
  draft: "neutral",
  // inquiries
  new: "warning",
  contacted: "info",
  closed: "neutral",
  // property requests
  in_progress: "info",
  matched: "success",
  // generic
  active: "success",
  inactive: "neutral",
  archived: "neutral",
}

export function statusTone(status: string): BadgeTone {
  return TONE_BY_STATUS[status] ?? "neutral"
}

/** Turns a snake_case API value into readable text for values without an
 * explicit translation (statuses are open-ended server-side). */
export function humanizeStatus(value: string): string {
  return value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
}
