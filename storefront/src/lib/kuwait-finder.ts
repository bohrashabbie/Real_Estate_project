/**
 * Kuwait Finder — the Public Authority for Civil Information's (PACI) official
 * map of Kuwait. It is the address system Kuwaitis actually navigate by: PACI
 * numbers, blocks, parcels and street numbering, none of which a generic world
 * map carries. That is why listings link into it alongside the ordinary map.
 */

/** PACI's web client. */
export const KUWAIT_FINDER_URL = "https://gis.paci.gov.kw/Client/";

/** The native apps, for visitors already on a phone. */
export const KUWAIT_FINDER_IOS_URL = "https://apps.apple.com/kw/app/kuwait-finder/id593476960";
export const KUWAIT_FINDER_ANDROID_URL =
  "https://play.google.com/store/apps/details?id=kw.gov.paci.kuwaitfinderandroid";

/**
 * Deep link onto a pinned location.
 *
 * The PACI client is an Esri app, so it takes Esri's `marker=<lng>,<lat>` and
 * `level=<zoom>` parameters. Their server is not reachable from outside Kuwait,
 * so that pairing could not be confirmed against this deployment — if it turns
 * out PACI names them differently, this function is the only place to change.
 * An unrecognised parameter is ignored rather than fatal: the worst case is
 * the finder opening on Kuwait as a whole instead of on the property.
 */
export function kuwaitFinderUrl(
  latitude?: number | null,
  longitude?: number | null,
): string {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return KUWAIT_FINDER_URL;
  }
  const params = new URLSearchParams({
    marker: `${longitude},${latitude}`,
    level: "17",
  });
  return `${KUWAIT_FINDER_URL}?${params.toString()}`;
}
