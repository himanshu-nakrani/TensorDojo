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
 * Side-by-side math + code primitive. The visual contract: math on the left,
 * code on the right, both inside the same card. On narrow screens the columns
 * stack.
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
        'my-10 border border-border rounded-lg overflow-hidden bg-surface',
        className,
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-6 flex flex-col">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-4">
            Math
          </div>
          <div
            className="text-ink flex-1 flex items-center justify-center overflow-x-auto py-2 [&_.katex-display]:my-0 [&_.katex-display]:text-ink"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="p-6 flex flex-col bg-surface-2/40">
          <div className="text-[10px] uppercase tracking-[0.18em] text-dim font-mono mb-4">
            Code
          </div>
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
