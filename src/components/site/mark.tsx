// TabMath mark: a receipt cut diagonally in two ("Split tab").
// Inline SVG with currentColor so it inherits text color (next/image can't).
// Masters and the don't-touch spec live in tab-math-icon/.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="28 16 44 69" width={Math.round((size * 44) / 69)} height={size} fill="currentColor" aria-hidden="true">
      <polygon points="28,16 72,16 72,40 28,56" />
      <polygon points="28,63 72,47 72,80 66.5,85 61,80 55.5,85 50,80 44.5,85 39,80 33.5,85 28,80" />
    </svg>
  );
}
