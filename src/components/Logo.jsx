/**
 * VisionBoard Logo — Mono (V-Monogram).
 *
 * Italic Playfair display "V" with a small gold serif bar
 * underneath. Premium / editorial feel. Picked over the Check
 * (tick) variant 2026-05-12 per user direction.
 *
 * Props (same API as before so callsites don't need to change):
 *   size — px (square). Default 24.
 *   c    — main glyph colour. Default `currentColor` so it inherits
 *          from parent CSS — pass an explicit colour when you need
 *          the mark on top of a tinted background (e.g. white on em).
 *   c2   — gold accent bar colour. Default `var(--gold)`. Pass null
 *          to suppress the bar entirely (use for very small slots
 *          where the bar becomes a sub-pixel artefact).
 *   strokeWidth — accepted for API compatibility but unused by this
 *          glyph (it's a filled text mark, not a stroked path).
 *
 * Font: relies on Playfair Display being loaded via --display in
 * index.css (line 66). Falls back to system serif — still readable
 * but less distinctive.
 */
export default function Logo({
  size = 24,
  c = 'currentColor',
  c2 = 'var(--gold)',
  // strokeWidth kept in the signature so callsites passing it don't
  // need to be edited; the Mono glyph has no stroke so we ignore it.
  // eslint-disable-next-line no-unused-vars
  strokeWidth,
  ...rest
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      {...rest}
    >
      <text
        x="32"
        y="50"
        fontFamily="'Playfair Display', serif"
        fontWeight="800"
        fontStyle="italic"
        fontSize="58"
        fill={c}
        textAnchor="middle"
        letterSpacing="-2"
      >V</text>
      {c2 && <rect x="20" y="55" width="24" height="1.8" fill={c2} rx="1" />}
    </svg>
  );
}
