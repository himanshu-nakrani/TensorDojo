

import { useEffect, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useWorkbench } from './Workbench';

interface CalloutProps {
  /** Small label rendered in the top-left, in monospace caps. */
  title?: string;
  children: ReactNode;
  /** Visual variant. 'try' is the default and uses the accent. */
  variant?: 'try' | 'note';
  className?: string;
  /**
   * If set, the callout gets a "Open in workbench →" button. When clicked,
   * the named interactive expands in the workbench, gets pulsed, and
   * the page scrolls to it.
   *
   * On narrow viewports (< lg) the right-column workbench collapses
   * underneath the prose, so scrolling there loses the reader's
   * place. Instead we mount the interactive *inline* below the
   * callout with a Close button, keeping the predict→manipulate
   * loop in one viewport.
   */
  targetInteractive?: string;
}

/**
 * Inline callout used to draw the reader's eye to a specific instruction.
 * When `targetInteractive` is set, the callout becomes the bridge from
 * prose to workbench: on wide viewports the named workbench item
 * expands; on narrow viewports the interactive is rendered in-place.
 */
export function Callout({
  title = 'Try this',
  children,
  variant = 'try',
  className,
  targetInteractive,
}: CalloutProps) {
  const workbench = useWorkbench();
  const isNarrow = useNarrowViewport();
  const [inlineOpen, setInlineOpen] = useState(false);

  const inlineEntry =
    isNarrow && targetInteractive
      ? workbench.getInteractive(targetInteractive)
      : undefined;

  const handleOpen = () => {
    if (!targetInteractive) return;
    if (isNarrow && inlineEntry) {
      setInlineOpen(true);
      return;
    }
    workbench.focusInteractive(targetInteractive);
  };

  return (
    <aside
      className={clsx(
        'my-6 rounded-md border-l-2 pl-6 pr-5 py-4',
        variant === 'try'
          ? 'border-accent bg-accent-faint'
          : 'border-border-strong bg-surface',
        className,
      )}
    >
      <div
        className={clsx(
          'text-[11px] uppercase tracking-[0.12em] font-mono mb-2',
          variant === 'try' ? 'text-accent' : 'text-muted',
        )}
      >
        {title}
      </div>
      <div className="text-ink text-[0.95rem] leading-relaxed [&>p]:m-0">
        {children}
      </div>
      {targetInteractive && !(isNarrow && inlineOpen) && (
        <button
          type="button"
          onClick={handleOpen}
          className="focus-ring mt-3 inline-flex items-center min-h-[44px] px-3 py-2 text-[12px] uppercase tracking-[0.12em] font-mono text-accent hover:text-accent-hover hover:bg-accent-soft rounded-md transition-colors -mx-3"
        >
          {isNarrow && inlineEntry ? 'Try it here →' : 'Open in workbench →'}
        </button>
      )}
      {inlineOpen && inlineEntry && (
        <InlineInteractive
          title={inlineEntry.title}
          onClose={() => setInlineOpen(false)}
        >
          <inlineEntry.Component />
        </InlineInteractive>
      )}
    </aside>
  );
}

function InlineInteractive({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 -mx-2 sm:mx-0 rounded-lg border border-border bg-bg p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
            Interactive
          </div>
          <div className="text-sm font-semibold text-ink tracking-[-0.005em] truncate">
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-bg-elevated px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-muted hover:text-ink hover:border-border-strong transition-colors"
          aria-label="Close inline interactive"
        >
          <span aria-hidden="true">×</span>
          Close
        </button>
      </div>
      {children}
    </div>
  );
}

/**
 * `true` when the viewport is below Tailwind's `lg` breakpoint
 * (1024px). SSR-safe: returns `false` on the server and on first
 * client render to match server output, then re-renders once the
 * media query has been read.
 */
function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1023.98px)');
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return narrow;
}
