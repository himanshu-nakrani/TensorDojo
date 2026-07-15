import katex from 'katex';
import 'katex/dist/katex.min.css';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface MathCodeProps {
  /** LaTeX expression. Display mode — no need to wrap in $$ or \[ \]. */
  math: string;
  /** Source code shown in the right column. Rendered as monospace. */
  code: string;
  /** Optional caption shown below the table (e.g. "softmax, numerically stable"). */
  caption?: string;
  /** Optional className for the outer container. */
  className?: string;
}

/**
 * Math + code primitive. Math on top, code below, both inside the same
 * card at the full prose-column width.
 *
 * Originally side-by-side on desktop, but a side-by-side layout at the
 * lesson's `max-w-prose` parent gave each column ~340px — narrower than
 * a typical 70-80 char Python line, so every figure forced horizontal
 * scroll. Stacking each block at full prose width is dramatically
 * easier to read with negligible loss of "compare math to code" since
 * the reader's eye covers the full vertical span anyway.
 */
export function MathCode({ math, code, caption, className }: MathCodeProps) {
  const html = katex.renderToString(math, {
    displayMode: true,
    throwOnError: false,
    strict: 'ignore',
  });

  return (
    <figure
      className={clsx(
        'my-10 border border-border rounded-lg bg-surface',
        className,
      )}
    >
      <div className="divide-y divide-border">
        <div className="p-6 flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-4">
            Math
          </div>
          {/* Math may still need horizontal scroll for wide matrices /
              multi-row equations that KaTeX can't break. */}
          <div
            className="text-ink flex-1 flex items-center justify-center overflow-x-auto py-2 [&_.katex-display]:my-0 [&_.katex-display]:text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="p-6 flex flex-col bg-surface-2/40">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono mb-4">
            Code
          </div>
          {/* Code stays in a <pre> (no soft wrap — breaking Python
              lines mid-statement hurts readability more than the rare
              scroll). At full prose width an 80-char line fits without
              scroll on every viewport above ~640px. */}
          <pre className="m-0 font-mono text-[13px] leading-relaxed text-ink overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      </div>
      {caption && (
        <figcaption className="px-5 py-2 border-t border-border bg-bg/40 text-[11px] text-muted font-mono tracking-wide">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Inline KaTeX for short math fragments used inside component props. */
export function InlineMath({ math, className }: { math: string; className?: string }) {
  const html = katex.renderToString(math, {
    displayMode: false,
    throwOnError: false,
    strict: 'ignore',
  });
  return (
    <span
      className={clsx('inline-math', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** Convenience: render a "block" of children with a small inline-math fragment. */
export function MathFragment({ children }: { children: ReactNode }) {
  return <span className="inline-math">{children}</span>;
}
