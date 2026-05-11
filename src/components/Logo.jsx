/**
 * VisionBoard Logo — the Check mark.
 *
 * Reads as both "V" (the brand letter) and as a completion tick —
 * matches what the app is about. Picked from the 8-direction
 * exploration in Downloads/VisionBoard Logo.html (2026-05-11).
 *
 * Props:
 *   size — px (square). Default 24.
 *   c    — main stroke colour. Default `currentColor` so it inherits
 *          from parent CSS — pass an explicit colour when you need
 *          the mark on top of a tinted background (e.g. white on em).
 *   c2   — accent dot colour at the tip of the tick. Default
 *          `var(--gold)`. Pass null/false to suppress the dot.
 *   strokeWidth — overrideable in case the icon sits in a really
 *          small slot and the default 7 looks heavy.
 *
 * Theme-aware by default — `c = currentColor` means the mark recolours
 * along with the surrounding text, and `var(--gold)` swaps across all
 * four themes (cream / dark / cream-pro / dark-os) without per-theme
 * branching here.
 */
export default function Logo({
  size = 24,
  c = 'currentColor',
  c2 = 'var(--gold)',
  strokeWidth = 7,
  ...rest
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      {...rest}
    >
      <path
        d="M10 24 L26 50 L54 14"
        stroke={c}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {c2 && <circle cx="54" cy="14" r="3.2" fill={c2} />}
    </svg>
  );
}
