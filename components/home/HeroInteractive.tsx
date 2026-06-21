import { DotProductExplorer } from '@/components/sim/DotProductExplorer';

/**
 * The hero's interactive panel. Wraps `DotProductExplorer` in a
 * decorative frame so it reads as the centerpiece demo and not just
 * another sim. The framing is the only "loud" element on the
 * landing page — everything else around it is type-led.
 *
 * The preset is the explorer's own default vectors, repeated
 * explicitly so the landing page is self-documenting: if the
 * underlying defaults ever shift, the hero is unaffected.
 */
export function HeroInteractive() {
  return (
    <div className="relative">
      <CornerTicks />
      <div className="rounded-xl border border-border-strong bg-bg-elevated p-5 sm:p-6 card-surface relative">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-accent">
            <span aria-hidden="true">◆ </span>
            <span className="hidden sm:inline">Live · drag a vector tip</span>
            <span className="sm:hidden">Live · drag a tip</span>
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-fg-muted shrink-0">
            Lesson 01
          </span>
        </div>
        <DotProductExplorer preset={{ a: [1.4, 0.6], b: [-0.4, 1.3] }} />
        <p className="mt-4 pt-4 border-t border-border text-[12px] text-fg-muted font-mono leading-relaxed">
          From the first lesson: vectors and the dot product.
        </p>
      </div>
    </div>
  );
}

/**
 * Four small right-angle marks at the corners of the hero panel.
 * Decorative — they read as registration marks on a technical
 * drawing and visually elevate the panel without adding chrome.
 */
function CornerTicks() {
  const stroke = 'rgb(var(--accent) / 0.5)';
  const size = 14;
  const inset = -6;
  const sw = 1.5;
  return (
    <>
      {/* Top left */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ top: inset, left: inset }}
      >
        <path
          d={`M 0 ${size} L 0 0 L ${size} 0`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
      {/* Top right */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ top: inset, right: inset }}
      >
        <path
          d={`M 0 0 L ${size} 0 L ${size} ${size}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
      {/* Bottom left */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ bottom: inset, left: inset }}
      >
        <path
          d={`M 0 0 L 0 ${size} L ${size} ${size}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
      {/* Bottom right */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ bottom: inset, right: inset }}
      >
        <path
          d={`M 0 ${size} L ${size} ${size} L ${size} 0`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw}
        />
      </svg>
    </>
  );
}
