'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TogglePillProps {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  /** Accessible name when the pill's visible text needs context. */
  'aria-label'?: string;
}

/**
 * The aria-pressed toggle used across sims. Off = hairline neutral
 * chip; on = signal-bordered chip with an LED dot. The whole pill
 * is one button so screen readers announce the pressed state.
 */
export function TogglePill({
  pressed,
  onClick,
  children,
  className,
  'aria-label': ariaLabel,
}: TogglePillProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        'focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1',
        'text-label font-mono uppercase tracking-[0.1em] transition-colors',
        pressed
          ? 'border-accent bg-accent-faint text-accent'
          : 'border-border-strong text-muted hover:border-accent/50 hover:text-ink',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
          pressed ? 'bg-accent' : 'bg-border-strong',
        )}
      />
      {children}
    </button>
  );
}
