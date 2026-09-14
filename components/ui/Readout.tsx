import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type ReadoutTone = 'default' | 'accent' | 'warning' | 'negative';

interface ReadoutProps {
  /** Tiny mono label above the value. */
  label: ReactNode;
  value: ReactNode;
  /** Optional unit rendered small and dim after the value. */
  unit?: ReactNode;
  tone?: ReadoutTone;
  className?: string;
}

const TONES: Record<ReadoutTone, string> = {
  default: 'text-ink',
  accent: 'text-accent',
  warning: 'text-warning',
  negative: 'text-negative',
};

/**
 * One cell of a readout bank: micro mono label over a large mono
 * tabular figure. Values are the instrument's answer to whatever
 * the reader is manipulating.
 */
export function Readout({
  label,
  value,
  unit,
  tone = 'default',
  className,
}: ReadoutProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="font-mono text-micro uppercase tracking-[0.14em] text-dim">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-mono text-[1.25rem] font-bold leading-none tracking-[-0.01em] tabular-nums',
          TONES[tone],
        )}
      >
        {value}
        {unit != null && (
          <span className="ml-1 text-caption font-medium text-dim">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
