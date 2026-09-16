interface LogoProps {
  /** Glyph size in px. Default 18. */
  size?: number;
  className?: string;
}

/**
 * TensorDojo logomark: two vectors leaving a shared origin, with the
 * parallelogram they span tinted between them — the dot product /
 * projection made literal. The glyph is pure `currentColor` +
 * `--accent` so it themes automatically in light and dark.
 */
export function Logo({ size = 18, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* spanned parallelogram */}
      <path
        d="M19.2 4.8 L21.4 12.6 L13.6 19.2 L4.8 19.2 Z"
        fill="rgb(var(--accent))"
        opacity="0.16"
      />
      {/* vector a */}
      <path
        d="M4.8 19.2 L19.2 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* vector b */}
      <path
        d="M4.8 19.2 L13.6 19.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* tip of a */}
      <circle cx="19.2" cy="4.8" r="2.3" fill="rgb(var(--accent))" />
      {/* origin */}
      <circle cx="4.8" cy="19.2" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Wordmark lockup: glyph + lowercase mono name. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <Logo size={18} className="text-ink shrink-0" />
      <span className="tracking-[0.04em] font-semibold">tensor dojo</span>
    </span>
  );
}
