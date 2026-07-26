import { DotProductExplorer } from '@/components/sim/DotProductExplorer';

/**
 * The hero's interactive panel, framed as a lab-notebook figure.
 * The left ink spine, figure caption, and cream card surface make
 * the live sim read as "Fig. 1" rather than a SaaS product demo —
 * matching the home page's editorial lab-notebook voice.
 *
 * The preset is the explorer's own default vectors, repeated
 * explicitly so the landing page is self-documenting: if the
 * underlying defaults ever shift, the hero is unaffected.
 */
export function HeroInteractive() {
  return (
    <div className="lab-note relative p-5 sm:p-6 pl-6 sm:pl-7">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-fg-subtle">
          Fig. 1 · Dot product as alignment
        </span>
        <span className="text-[11px] uppercase tracking-[0.12em] font-mono text-accent shrink-0">
          <span aria-hidden="true">◆ </span>
          Live
        </span>
      </div>

      <h3 className="lab-display text-[1.2rem] sm:text-[1.3rem] text-ink leading-snug mb-4">
        When two vectors agree
      </h3>

      <DotProductExplorer preset={{ a: [1.4, 0.6], b: [-0.4, 1.3] }} />

      <p className="mt-4 pt-4 border-t border-border text-[12px] text-fg-muted font-mono leading-relaxed">
        Drag either tip. The signed product and cosine update live — same
        arithmetic the transformer uses.
      </p>
    </div>
  );
}
