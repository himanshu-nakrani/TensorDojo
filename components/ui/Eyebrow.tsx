import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type EyebrowSize = 'micro' | 'label' | 'caption';

interface EyebrowProps {
  children: ReactNode;
  /** Render the label in the signal color instead of dim ink. */
  accent?: boolean;
  size?: EyebrowSize;
  className?: string;
}

/**
 * The mono label recipe from the design language: uppercase,
 * letter-spaced, JetBrains Mono. Eyebrows sit above titles and
 * label figure areas.
 */
export function Eyebrow({
  children,
  accent = false,
  size = 'label',
  className,
}: EyebrowProps) {
  return (
    <div
      className={cn(
        'font-mono uppercase tracking-[0.14em]',
        size === 'micro' && 'text-micro',
        size === 'label' && 'text-label',
        size === 'caption' && 'text-caption',
        accent ? 'text-accent' : 'text-dim',
        className,
      )}
    >
      {children}
    </div>
  );
}
