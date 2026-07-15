

import type { ReactNode } from 'react';
import clsx from 'clsx';

interface SimFrameProps {
  title: string;
  /** Shorthand: renders a Reset-style header button on the right. */
  onReset?: () => void;
  /** Custom label for the reset button. Defaults to "Reset". */
  resetLabel?: string;
  /**
   * Custom header content rendered on the right of the title. Use when you
   * need toggle pills, segmented controls, or multiple buttons. If provided,
   * `onReset` is ignored.
   */
  headerAction?: ReactNode;
  /** Adds `flex-wrap gap-3` to the header row for narrow viewports. */
  headerWrap?: boolean;
  className?: string;
  children: ReactNode;
}

export function SimFrame({
  title,
  onReset,
  resetLabel = 'Reset',
  headerAction,
  headerWrap,
  className,
  children,
}: SimFrameProps) {
  const action =
    headerAction ??
    (onReset ? (
      <button
        type="button"
        onClick={onReset}
        className="text-[11px] uppercase tracking-[0.12em] font-mono text-muted hover:text-ink focus-ring transition-colors"
      >
        {resetLabel}
      </button>
    ) : null);

  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-surface p-6 sm:p-8 card-surface',
        className,
      )}
    >
      <div
        className={clsx(
          'flex items-baseline justify-between mb-5',
          headerWrap && 'flex-wrap gap-3',
        )}
      >
        <h3 className="text-[11px] uppercase tracking-[0.12em] text-dim font-mono">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
