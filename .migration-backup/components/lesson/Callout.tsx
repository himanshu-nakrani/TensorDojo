'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useWorkbench } from './Workbench';
import { Button } from '@/components/ui/Button';

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
  const [experiment, setExperiment] = useState<{
    index: number;
    total: number;
  } | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const inlineEntry =
    isNarrow && targetInteractive
      ? workbench.getInteractive(targetInteractive)
      : undefined;

  useLayoutEffect(() => {
    if (variant !== 'try') return;
    const el = rootRef.current;
    if (!el) return;
    let start: Element = el;
    while (start.previousElementSibling?.matches('aside[data-callout="try"]')) {
      start = start.previousElementSibling;
    }
    const group: Element[] = [];
    let n: Element | null = start;
    while (n?.matches('aside[data-callout="try"]')) {
      group.push(n);
      n = n.nextElementSibling;
    }
    if (group.length < 2) {
      setExperiment(null);
      return;
    }
    setExperiment({
      index: group.indexOf(el) + 1,
      total: group.length,
    });
  }, [variant]);

  const handleOpen = () => {
    if (!targetInteractive) return;
    if (isNarrow && inlineEntry) {
      setInlineOpen(true);
      return;
    }
    workbench.focusInteractive(targetInteractive);
  };

  const inSequence = experiment !== null;
  const label = inSequence
    ? title === 'Try this'
      ? `Experiment ${experiment.index}`
      : `${experiment.index} · ${title}`
    : title;

  const chip = targetInteractive && inSequence && !(isNarrow && inlineOpen);

  return (
    <aside
      ref={rootRef}
      data-callout={variant}
      className={clsx(
        'rounded-md border-l-2 pl-6 pr-5 py-4',
        inSequence ? 'my-2 bg-transparent' : 'my-6',
        variant === 'try' && !inSequence && 'border-accent bg-accent-faint',
        variant === 'try' && inSequence && 'border-accent',
        variant === 'note' && 'border-border-strong bg-surface',
        className,
      )}
    >
      {chip ? (
        <button
          type="button"
          onClick={handleOpen}
          className="focus-ring mb-2 inline-flex items-center rounded-sm border border-accent/40 px-2 py-0.5 font-mono text-micro uppercase tracking-[0.12em] text-accent hover:bg-accent-faint transition-colors"
        >
          {label}
        </button>
      ) : (
        <div
          className={clsx(
            'text-label font-mono mb-2',
            variant === 'try'
              ? 'uppercase tracking-[0.12em] text-accent'
              : 'text-muted',
          )}
        >
          {label}
        </div>
      )}
      <div className="text-ink text-[0.95rem] leading-relaxed [&>p]:m-0">
        {children}
      </div>
      {targetInteractive && !inSequence && !(isNarrow && inlineOpen) && (
        <button
          type="button"
          onClick={handleOpen}
          className="focus-ring mt-3 font-mono text-label text-accent hover:text-accent-hover transition-colors"
        >
          {isNarrow && inlineEntry ? 'Try it here' : 'Try it in the workbench'}
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
          <div className="text-label uppercase tracking-[0.12em] text-dim font-mono">
            Interactive
          </div>
          <div className="text-sm font-semibold text-ink tracking-[-0.005em] truncate">
            {title}
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onClose}
          className="min-h-[36px] shrink-0 px-2.5 py-1 text-label"
          aria-label="Close inline interactive"
        >
          <span aria-hidden="true">×</span>
          Close
        </Button>
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
