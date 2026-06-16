'use client';

import { ReactNode } from 'react';
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
   */
  targetInteractive?: string;
}

/**
 * Inline callout used to draw the reader's eye to a specific instruction.
 * When `targetInteractive` is set, the callout becomes the bridge from
 * prose to workbench: clicking the button expands and pulses the named
 * interactive in the right column.
 */
export function Callout({
  title = 'Try this',
  children,
  variant = 'try',
  className,
  targetInteractive,
}: CalloutProps) {
  const workbench = useWorkbench();
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
          'text-[10px] uppercase tracking-[0.18em] font-mono mb-2',
          variant === 'try' ? 'text-accent' : 'text-muted',
        )}
      >
        {title}
      </div>
      <div className="text-ink text-[0.95rem] leading-relaxed [&>p]:m-0">
        {children}
      </div>
      {targetInteractive && (
        <button
          type="button"
          onClick={() => workbench.focusInteractive(targetInteractive)}
          className="mt-3 text-[11px] uppercase tracking-[0.18em] font-mono text-accent hover:text-accent-hover transition-colors"
        >
          Open in workbench →
        </button>
      )}
    </aside>
  );
}
