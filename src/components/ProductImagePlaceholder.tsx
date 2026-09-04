/**
 * Shown wherever a product has no real photo yet (src/lib/productImage.ts's
 * getPrimaryImage returns null). Deliberately plain — a muted icon, not an
 * illustration or AI-generated scene — so it reads unambiguously as "no
 * photo yet" rather than as real or intentional documentary photography
 * (see the brand spec's compliance rule against presenting fabricated
 * imagery as real). Drop into any `relative` container; fills it via
 * absolute inset-0.
 */
export function ProductImagePlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className="h-1/3 w-1/3 max-h-12 max-w-12 min-h-4 min-w-4 text-belt-300">
        <path
          d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 3.5c0 1-1 1-1 2s1 1 1 2M12 3.5c0 1-1 1-1 2s1 1 1 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
