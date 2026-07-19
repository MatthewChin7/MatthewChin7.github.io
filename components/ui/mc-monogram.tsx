/**
 * The MC monogram. Constructed on a 32×32 grid:
 * M — two verticals joined by a shallow valley (a price path's drawdown);
 * C — a three-quarter gauge arc, mouth open to the right;
 * node — a single signal-colored data point marking the M's valley vertex.
 * (The node lives on the M, not in the C's mouth, so the C never reads as G.)
 * Construction documented in docs/visual-direction.md.
 */
export function MCMonogram({
  size = 24,
  title,
  className,
}: {
  size?: number;
  /** Accessible name. Omit for decorative use (renders aria-hidden). */
  title?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M4 26 V6 L9.5 18 L15 6 V26"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M28.8 10.7 A7.5 7.5 0 1 0 28.8 21.3"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
      <circle cx="9.5" cy="18" r="2.75" fill="var(--signal, currentColor)" />
    </svg>
  );
}
