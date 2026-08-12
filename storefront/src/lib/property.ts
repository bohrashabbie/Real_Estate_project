/**
 * Property-type keys that have no rooms to filter on.
 *
 * Keys are the stable `PropertyType.key` values seeded in `Api/app/seed.py`
 * (villa, apartment, floor, land, office, chalet, commercial, other) — not
 * translated names, which differ per locale.
 *
 * Filtering "3+ rooms" on a plot of land can only ever return nothing, so the
 * rooms control is withdrawn while the selection is entirely roomless. Add a
 * key here to withdraw it for another type.
 */
const ROOMLESS_TYPE_KEYS: ReadonlySet<string> = new Set(["land", "floor"]);

/**
 * Should the rooms filter be offered for this selection?
 *
 * An empty selection means "all types", which includes ones that do have
 * rooms — so the control stays. It is withdrawn only when *every* selected
 * type is roomless; a visitor who picked both "land" and "apartment" is still
 * shopping for rooms.
 */
export function roomsFilterApplies(selectedTypeKeys: readonly string[]): boolean {
  if (selectedTypeKeys.length === 0) return true;
  return selectedTypeKeys.some((key) => !ROOMLESS_TYPE_KEYS.has(key));
}
