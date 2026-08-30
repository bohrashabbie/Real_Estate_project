/**
 * The kwt25 lockup: the gold mark from the office's logo beside the wordmark.
 *
 * The reference ships its brand as one flat SVG per surface. kwt25's logo is a
 * raster illustration, so the wordmark is set in live text next to a cut-out of
 * the mark instead — which also means the name reads correctly to a screen
 * reader and stays crisp at every density without shipping two more files.
 *
 * The header and the footer carry the office's own logo artwork instead
 * (see `components/layout/header.tsx` and `footer.tsx`) — its wordmark is
 * already baked into that image, and at footer scale its faint cutout halo
 * (see the header's own comment on it) is unobtrusive enough to use there
 * too. This lockup now remains for one surface: the smart-search wizard's
 * navy sidebar, which is narrower and darker, where that halo would read
 * as more of a smudge.
 *
 * `tone` still picks the surface a lockup sits on — `light` for a cream
 * ground, `reversed` for navy — in case a future surface needs the
 * live-text version again.
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
