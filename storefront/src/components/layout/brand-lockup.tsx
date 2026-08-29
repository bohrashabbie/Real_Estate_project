/**
 * The kwt25 lockup: the gold mark from the office's logo beside the wordmark.
 *
 * The reference ships its brand as one flat SVG per surface. kwt25's logo is a
 * raster illustration, so the wordmark is set in live text next to a cut-out of
 * the mark instead — which also means the name reads correctly to a screen
 * reader and stays crisp at every density without shipping two more files.
 *
 * The header carries the office's own logo artwork instead (see
 * `components/layout/header.tsx`) — its wordmark is already baked into that
 * image and cuts cleanly only against a light ground, so this lockup remains
 * for the navy surfaces: the footer and the wizard sidebar.
 *
 * `tone` picks the surface: `light` for a cream ground, `reversed` for the
 * navy footer and the wizard sidebar.
 */
export function BrandLockup({
  name,
  tone = "light",
  size = "md",
}: {
  name: string;
  tone?: "light" | "reversed";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <span className={`brand-lockup brand-lockup-${tone} brand-lockup-${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/intro-building.png" alt="" aria-hidden />
      <span className="brand-lockup-copy">
        <b>{name}</b>
        <small>عقار الكويت</small>
      </span>
    </span>
  );
}
